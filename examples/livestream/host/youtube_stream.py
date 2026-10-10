"""YouTube's official StreamList RPC; only the wire fields used by this demo.

Field numbers and RPC path follow Google's published stream_list.proto:
https://developers.google.com/youtube/v3/live/streaming-live-chat
Unknown protobuf fields are preserved/ignored by the standard protobuf runtime.
No generated client SDK or build-time protoc is required.
"""
import asyncio
import logging

import grpc
from google.protobuf import descriptor_pb2, descriptor_pool, message_factory

logger = logging.getLogger(__name__)
RPC = "/youtube.api.v3.V3DataLiveChatMessageService/StreamList"
TARGET = "dns:///youtube.googleapis.com:443"


def _messages():
    schema = descriptor_pb2.FileDescriptorProto(name="portal_youtube_stream.proto", package="portal.youtube", syntax="proto2")
    string, integer, message = 9, 5, 11
    definitions = {
        "Request": [("live_chat_id", 1, string, "", False), ("page_token", 99, string, "", False), ("part", 100, string, "", True)],
        "Response": [("offline_at", 2, string, "", False), ("next_page_token", 100602, string, "", False), ("items", 1007, message, "Item", True)],
        "Item": [("id", 101, string, "", False), ("snippet", 2, message, "Snippet", False), ("author_details", 3, message, "Author", False)],
        "Author": [("channel_id", 10101, string, "", False), ("display_name", 103, string, "", False)],
        "Snippet": [("type", 1, integer, "", False), ("published_at", 4, string, "", False), ("text_message_details", 19, message, "Text", False)],
        "Text": [("message_text", 1, string, "", False)],
    }
    for name, fields in definitions.items():
        definition = schema.message_type.add(name=name)
        for name, number, kind, target, repeated in fields:
            field = definition.field.add(name=name, number=number, type=kind, label=3 if repeated else 1)
            if target:
                field.type_name = ".portal.youtube." + target
    pool = descriptor_pool.DescriptorPool()
    pool.Add(schema)
    return tuple(message_factory.GetMessageClass(pool.FindMessageTypeByName("portal.youtube." + name)) for name in ("Request", "Response"))


StreamRequest, StreamResponse = _messages()


class StreamError(Exception):
    def __init__(self, code, retry_after=0):
        self.code, self.retry_after = code, retry_after
        super().__init__(code)


def _error(error):
    status = error.code()
    # Inspect only for classification. Never log upstream descriptions/trailers.
    details = (error.details() or "").lower()
    logger.warning("Portal YouTube StreamList error grpc_status=%s", status.name)
    if status in (grpc.StatusCode.RESOURCE_EXHAUSTED, grpc.StatusCode.PERMISSION_DENIED) and any(term in details for term in ("quota", "daily limit")):
        return StreamError("live_platform_limited", 3600)
    if status == grpc.StatusCode.RESOURCE_EXHAUSTED:
        return StreamError("live_platform_limited", 30)
    if status == grpc.StatusCode.UNAUTHENTICATED:
        return StreamError("live_auth_required")
    if status == grpc.StatusCode.PERMISSION_DENIED:
        return StreamError("live_youtube_permissions_required")
    if status in (grpc.StatusCode.NOT_FOUND, grpc.StatusCode.FAILED_PRECONDITION):
        return StreamError("live_room_offline")
    if status in (grpc.StatusCode.DEADLINE_EXCEEDED, grpc.StatusCode.UNAVAILABLE, grpc.StatusCode.INTERNAL, grpc.StatusCode.CANCELLED):
        return StreamError("live_stream_reconnect", 2)
    return StreamError("live_platform_error", 30)


async def stream_pages(headers, chat_id, page_token, lifetime):
    """One TLS RPC. Idle reads stay open; cancellation closes both call/channel."""
    request = StreamRequest(live_chat_id=chat_id, part=["id", "snippet", "authorDetails"])
    if page_token:
        request.page_token = page_token
    async with grpc.aio.secure_channel(TARGET, grpc.ssl_channel_credentials(), options=[
        ("grpc.enable_http_proxy", 0), ("grpc.max_receive_message_length", 8 * 1024 * 1024),
    ]) as channel:
        method = channel.unary_stream(RPC, request_serializer=StreamRequest.SerializeToString,
                                      response_deserializer=StreamResponse.FromString)
        call = method(request, metadata=(("authorization", headers["Authorization"]),), timeout=lifetime)
        try:
            page = await asyncio.wait_for(call.read(), 20)
            while page is not grpc.aio.EOF:
                yield {"nextPageToken": page.next_page_token, "offlineAt": page.offline_at,
                       "ended": any(item.snippet.type == 4 for item in page.items),
                       "items": [{"id": item.id, "user_id": item.author_details.channel_id,
                                  "name": item.author_details.display_name, "text": item.snippet.text_message_details.message_text,
                                  "published_at": item.snippet.published_at}
                                 for item in page.items if item.snippet.type == 1]}
                page = await call.read()
        except grpc.aio.AioRpcError as error:
            raise _error(error) from None
        except TimeoutError:
            raise StreamError("live_stream_reconnect", 2) from None
        finally:
            call.cancel()
