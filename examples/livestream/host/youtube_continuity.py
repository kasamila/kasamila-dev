"""YouTube event rollover on a fixed reusable ingest stream (Portal only).

Persist the creation intent BEFORE insert. Unknown outcomes are reconciled by a
unique description marker, never blindly retried. Only the OBS owner adapter
may manage broadcasts; viewer adapters only use the resolved video ID.
"""
import copy
import time
import uuid
from datetime import datetime, timedelta, timezone

from .platforms import request, YOUTUBE, PlatformError


def destination(room):
    return (room.get('youtube_state', {}).get('video') or room['destination']) if room['platform'] == 'youtube' and room.get('youtube_follow',True) else room['destination']


class YouTubeContinuity:
    def __init__(self, adapter, persist):
        self.adapter, self.persist = adapter, persist
        self.room = adapter.room
        self.state = copy.deepcopy(self.room.get('youtube_state', {}))

    async def store(self, **changes):
        state = {**self.state, **changes}
        await self.persist(state)
        self.state = state
        self.room['youtube_state'] = copy.deepcopy(state)

    async def api(self, method, resource, **kwargs):
        return await request(method, YOUTUBE + resource, headers=await self.adapter.headers(), **kwargs)

    async def broadcasts(self, **params):
        return (await self.api('GET', 'liveBroadcasts', params={'part':'snippet,status,contentDetails', **params})).get('items', [])

    def owned(self, row):
        if row.get('snippet', {}).get('channelId') != self.adapter.token['user_id']:
            raise PlatformError('live_owner_mismatch')
        return row

    async def candidates(self, stream):
        rows = []
        for status in ('active', 'upcoming'):
            token = None
            for _ in range(4):
                value = await self.api('GET', 'liveBroadcasts', params={'part':'snippet,status,contentDetails',
                    'broadcastStatus':status,'broadcastType':'all','maxResults':50, **({'pageToken':token} if token else {})})
                rows.extend(self.owned(row) for row in value.get('items', []) if row.get('contentDetails', {}).get('boundStreamId') == stream)
                token = value.get('nextPageToken')
                if not token: break
            if token: raise PlatformError('live_youtube_review')
        return rows

    async def select(self, row):
        self.owned(row)
        if self.state.get('video') != row['id']:
            await self.store(video=row['id'], phase='watching', pending=None, marker=None)
        if row.get('status', {}).get('lifeCycleStatus') != 'live':
            raise PlatformError('live_room_offline', 60)
        chat = row.get('snippet', {}).get('liveChatId')
        if not chat: raise PlatformError('live_room_offline', 60)
        return chat

    async def resolve(self):
        current = self.state.get('pending') or self.state.get('video') or self.room['destination']
        rows = await self.broadcasts(id=current)
        if not rows: raise PlatformError('live_youtube_review', 300)
        previous = self.owned(rows[0])
        stream = self.state.get('stream') or previous.get('contentDetails', {}).get('boundStreamId')
        if not stream: raise PlatformError('live_youtube_stream_required', 300)
        if not self.state.get('stream'): await self.store(stream=stream, video=current)
        if self.state.get('pending'):
            return await self.bind_pending(previous, stream)
        lifecycle = previous.get('status', {}).get('lifeCycleStatus')
        if lifecycle in ('live','testing','ready','created','liveStarting','testStarting'):
            return await self.select(previous)
        if lifecycle != 'complete': raise PlatformError('live_youtube_review', 300)
        candidates = await self.candidates(stream)
        live = [r for r in candidates if r.get('status', {}).get('lifeCycleStatus') == 'live']
        choices = live or candidates
        if len(choices) > 1: raise PlatformError('live_youtube_review', 300)
        if choices: return await self.select(choices[0])
        if not self.room.get('youtube_auto_continue'):
            raise PlatformError('live_room_offline', 60)
        if self.state.get('phase') == 'creating':
            # A timeout/restart after insert may have left an unbound event.
            found = []
            token = None
            for _ in range(4):
                value = await self.api('GET','liveBroadcasts',params={'part':'snippet,status,contentDetails','broadcastStatus':'upcoming',
                    'broadcastType':'all','maxResults':50, **({'pageToken':token} if token else {})})
                found.extend(self.owned(r) for r in value.get('items',[]) if self.state['marker'] in r.get('snippet',{}).get('description',''))
                token = value.get('nextPageToken')
                if not token: break
            if len(found) != 1 or token: raise PlatformError('live_youtube_review',300)
            await self.store(pending=found[0]['id'],phase='binding')
            return await self.bind_pending(found[0],stream)
        streams = (await self.api('GET','liveStreams',params={'part':'snippet,status,contentDetails','id':stream})).get('items',[])
        if not streams: raise PlatformError('live_youtube_stream_required',300)
        ingest = self.owned(streams[0])
        if not ingest.get('contentDetails',{}).get('isReusable'): raise PlatformError('live_youtube_stream_required',300)
        if ingest.get('status',{}).get('streamStatus') != 'active': raise PlatformError('live_youtube_waiting_ingest',60)
        if time.time()-self.state.get('last_created',0)<600: raise PlatformError('live_youtube_cooldown',60)
        status=previous.get('status',{})
        if status.get('madeForKids') or status.get('selfDeclaredMadeForKids') or status.get('privacyStatus') not in ('public','unlisted','private'):
            raise PlatformError('live_youtube_review',300)
        marker='[Kasamila continuation '+uuid.uuid4().hex+']'
        snippet=previous['snippet']; description=snippet.get('description','')
        # Remove only our prior machine marker to avoid accumulating it each time.
        import re
        description=re.sub(r'\n?\[Kasamila continuation [a-f0-9]{32}\]','',description)
        if len(description)+len(marker)+1>5000: raise PlatformError('live_youtube_review',300)
        body={'snippet':{'title':snippet['title'],'description':description+'\n'+marker,
              'scheduledStartTime':(datetime.now(timezone.utc)+timedelta(seconds=30)).isoformat()},
              'status':{'privacyStatus':status['privacyStatus'],'selfDeclaredMadeForKids':False},
              'contentDetails':{k:v for k,v in previous.get('contentDetails',{}).items() if k in
                  ('enableDvr','enableEmbed','recordFromStart','enableClosedCaptions','availabilityConfig')}}
        body['contentDetails'].update(enableAutoStart=True,enableAutoStop=False,monitorStream={'enableMonitorStream':False})
        await self.store(phase='creating',marker=marker,last_created=time.time(),privacy=status['privacyStatus'])
        created=await self.api('POST','liveBroadcasts',params={'part':'snippet,status,contentDetails'},json=body)
        await self.store(pending=created['id'],phase='binding')
        return await self.bind_pending(created,stream)

    async def bind_pending(self, row, stream):
        self.owned(row)
        # Unaudited API projects may force new broadcasts to private. Do not
        # silently start one with different visibility from the approved event.
        if self.state.get('privacy') and row.get('status',{}).get('privacyStatus') != self.state['privacy']:
            raise PlatformError('live_youtube_review',300)
        bound=row.get('contentDetails',{}).get('boundStreamId')
        if bound and bound!=stream: raise PlatformError('live_youtube_review',300)
        if not bound:
            row=await self.api('POST','liveBroadcasts/bind',params={'id':row['id'],'streamId':stream,'part':'snippet,status,contentDetails'})
        return await self.select(row)
