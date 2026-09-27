"""Package an already processed template video for consumer-owned HLS delivery.

The output directory is new/empty; upload its contents unchanged to the
consumer's CORS-enabled media origin. Kasamila continues to own the mesh.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import subprocess
from pathlib import Path


def probe(video: Path) -> dict:
    result = subprocess.run(
        ["ffprobe", "-v", "error", "-select_streams", "v:0",
         "-show_entries", "stream=width,height,avg_frame_rate,nb_frames",
         "-show_entries", "format=duration", "-of", "json", str(video)],
        check=True, capture_output=True, text=True,
    )
    data = json.loads(result.stdout)
    stream = data["streams"][0]
    num, den = (int(value) for value in stream["avg_frame_rate"].split("/"))
    return {
        "width": int(stream["width"]), "height": int(stream["height"]),
        "fps": num / den,
        "frames": int(stream.get("nb_frames") or 0),
        "duration": float(data["format"]["duration"]),
    }


def package(
    video: Path, destination: Path, *, public_url: str, timeline_id: str,
    frame_count: int, fps: float, logical_width: int, logical_height: int,
    layout: str, matte_layout: dict | None = None,
    expected_source_sha256: str | None = None,
) -> dict:
    if not video.is_file():
        raise FileNotFoundError(video)
    if destination.exists() and any(destination.iterdir()):
        raise FileExistsError(f"Refusing to overwrite nonempty HLS directory: {destination}")
    if len(timeline_id) != 64 or any(ch not in "0123456789abcdef" for ch in timeline_id):
        raise ValueError("timeline_id must be the 64-character manifest value")
    if not public_url.startswith("https://"):
        raise ValueError("public_url must use HTTPS")
    if layout not in {"original", "packed_matte"}:
        raise ValueError("HLS v1 supports original or packed_matte layout")
    if layout == "packed_matte" and not matte_layout:
        raise ValueError("packed_matte requires matte_layout")
    if layout == "packed_matte":
        color = matte_layout.get("color_region")
        matte = matte_layout.get("matte_region")
        if color != [0, 0, 2 / 3, 1] or matte != [2 / 3, 0, 1 / 3, 0.5]:
            raise ValueError("Unsupported packed-matte color/alpha arrangement")
    metadata = probe(video)
    expected_width = round(logical_width / matte_layout["color_region"][2]) if matte_layout else logical_width
    if (metadata["width"], metadata["height"]) != (expected_width, logical_height):
        raise ValueError("Video dimensions differ from the geometry/matte contract")
    if abs(metadata["fps"] - fps) > 0.001:
        raise ValueError("Video FPS differs from the Kasamila geometry data")
    if metadata["frames"] and metadata["frames"] != frame_count:
        raise ValueError("Video frame count differs from the Kasamila geometry data")
    if abs(metadata["duration"] - frame_count / fps) > max(0.25, 1 / fps):
        raise ValueError("Video duration differs from the Kasamila geometry data")
    source_digest = hashlib.sha256()
    with video.open("rb") as stream:
        for block in iter(lambda: stream.read(1024 * 1024), b""):
            source_digest.update(block)
    source_sha256 = source_digest.hexdigest()
    if expected_source_sha256 and source_sha256 != expected_source_sha256:
        raise ValueError("Source MP4 SHA-256 differs from the Kasamila media contract")
    destination.mkdir(parents=True, exist_ok=True)
    gop = max(1, round(fps * 2))
    subprocess.run([
        "ffmpeg", "-hide_banner", "-loglevel", "error", "-nostdin", "-i", str(video),
        "-an", "-c:v", "libx264", "-preset", "medium",
        "-crf", "17" if layout == "packed_matte" else "20",
        "-pix_fmt", "yuv420p", "-fps_mode", "passthrough",
        "-g", str(gop), "-keyint_min", str(gop), "-sc_threshold", "0",
        "-force_key_frames", "expr:gte(t,n_forced*2)",
        "-f", "hls", "-hls_time", "2", "-hls_playlist_type", "vod",
        "-hls_flags", "independent_segments", "-hls_segment_type", "fmp4",
        "-hls_fmp4_init_filename", "init.mp4",
        "-hls_segment_filename", str(destination / "segment-%05d.m4s"),
        str(destination / "index.m3u8"),
    ], check=True)
    if not (destination / "index.m3u8").is_file():
        raise RuntimeError("HLS playlist was not generated")
    playlist = (destination / "index.m3u8").read_text(encoding="utf-8")
    if ("#EXT-X-INDEPENDENT-SEGMENTS" not in playlist
        or "#EXT-X-MAP:" not in playlist or "#EXT-X-ENDLIST" not in playlist
        or not any(destination.glob("segment-*.m4s"))):
        raise RuntimeError("HLS VOD playlist is missing independent fMP4 segments")
    descriptor = {
        "delivery": "hls", "url": public_url.rstrip("/") + "/index.m3u8",
        "timelineId": timeline_id, "frameCount": frame_count, "fps": fps,
        "width": logical_width, "height": logical_height, "layout": layout,
        "segmentDuration": 2,
        "canonicalVideoSha256": source_sha256,
    }
    if matte_layout:
        descriptor["matteLayout"] = matte_layout
    (destination / "kasamila-media.json").write_text(
        json.dumps(descriptor, indent=2), encoding="utf-8"
    )
    return descriptor


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("video", type=Path)
    parser.add_argument("destination", type=Path)
    parser.add_argument("--public-url", required=True)
    parser.add_argument("--timeline-id", required=True)
    parser.add_argument("--frame-count", type=int, required=True)
    parser.add_argument("--fps", type=float, required=True)
    parser.add_argument("--width", type=int, required=True)
    parser.add_argument("--height", type=int, required=True)
    parser.add_argument("--layout", choices=("original", "packed_matte"), default="original")
    parser.add_argument("--matte-layout-json")
    parser.add_argument("--source-sha256",
                        help="Expected preview_video or preview_video_matte SHA-256 from the media contract")
    args = parser.parse_args()
    result = package(
        args.video, args.destination, public_url=args.public_url,
        timeline_id=args.timeline_id, frame_count=args.frame_count,
        fps=args.fps, logical_width=args.width, logical_height=args.height,
        layout=args.layout,
        matte_layout=json.loads(args.matte_layout_json) if args.matte_layout_json else None,
        expected_source_sha256=args.source_sha256,
    )
    print(json.dumps(result, indent=2))


if __name__ == "__main__":
    main()
