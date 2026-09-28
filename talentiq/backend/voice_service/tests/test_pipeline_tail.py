import unittest

import numpy as np

from voice_filtering.audio.resample import StreamingResampler
from voice_filtering.contracts import AudioFrame
from voice_filtering.pipeline.controller import PipelineControllerImpl


class PassthroughHush:
    is_loaded = True

    def process(self, frame):
        return frame


class QueuedSource:
    def __init__(self, frames):
        self.frames = list(frames)

    def read_frame(self, timeout_s):
        return self.frames.pop(0) if self.frames else None


class PassthroughRNNoise:
    is_loaded = True

    def process(self, frame):
        return frame


class CollectingScheduler:
    def __init__(self):
        self.frames = []

    def push_audio(self, frame):
        self.frames.append(frame)


class PipelineTailTests(unittest.TestCase):
    def test_capture_drains_frames_already_queued_at_stop(self):
        frame = AudioFrame(
            session_id="session", epoch=0, seq=0, sample_start=0,
            captured_ns=0, sample_rate=48000,
            pcm=np.full(480, 0.02, dtype=np.float32),
            valid_samples=480, discontinuity=False,
        )
        source = QueuedSource([frame])
        scheduler = CollectingScheduler()
        controller = PipelineControllerImpl(
            source=source, resampler=StreamingResampler(), transcriber=None,
            scheduler=scheduler, on_event=lambda event: None,
            rnnoise=PassthroughRNNoise(), hush=PassthroughHush(),
        )
        controller._capture_stop_event.set()
        controller._capture_loop()
        self.assertEqual(source.frames, [])
        self.assertEqual(sum(item.valid_samples for item in scheduler.frames), 160)

    def test_resampler_tail_reaches_asr_when_capture_ends(self):
        resampler = StreamingResampler()
        for index in range(50):
            resampler.push(AudioFrame(
                session_id="session", epoch=0, seq=index,
                sample_start=index * 480, captured_ns=index * 10_000_000,
                sample_rate=48000,
                pcm=np.full(480, 0.02, dtype=np.float32),
                valid_samples=480, discontinuity=False,
            ))
        scheduler = CollectingScheduler()
        controller = PipelineControllerImpl(
            source=QueuedSource([]), resampler=resampler, transcriber=None,
            scheduler=scheduler, on_event=lambda event: None,
            hush=PassthroughHush(),
        )
        controller._capture_stop_event.set()
        controller._capture_loop()
        self.assertEqual(sum(frame.valid_samples for frame in scheduler.frames), 320)


if __name__ == "__main__":
    unittest.main()
