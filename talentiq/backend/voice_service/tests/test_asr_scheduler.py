import unittest

import numpy as np

from voice_filtering.asr.whisper import ASRScheduler
from voice_filtering.contracts import AudioFrame


class RecordingTranscriber:
    def __init__(self):
        self.inputs = []

    def decode(self, pcm, prompt=""):
        self.inputs.append(pcm.copy())
        return "heard speech"


class ASRSchedulerSpeechTests(unittest.TestCase):
    def setUp(self):
        self.transcriber = RecordingTranscriber()
        self.events = []
        self.scheduler = ASRScheduler(self.transcriber, self.events.append)
        self.scheduler.start("session", 0, "combined")
        self.frame_index = 0

    def push(self, amplitude, count, process=True):
        for _ in range(count):
            index = self.frame_index
            self.frame_index += 1
            self.scheduler.push_audio(AudioFrame(
                session_id="session", epoch=0, seq=index,
                sample_start=index * 480, captured_ns=index * 10_000_000,
                sample_rate=16000,
                pcm=np.full(160, amplitude, dtype=np.float32),
                valid_samples=160, discontinuity=False,
            ))
            if process:
                self.scheduler.run_step()

    def test_brief_quiet_dip_does_not_split_sentence(self):
        self.push(0.02, 70)
        self.push(0.0, 1)
        self.push(0.02, 40)
        self.assertEqual(self.events, [])
        self.push(0.0, 60)
        self.assertEqual(len(self.events), 1)
        self.assertEqual(len(self.transcriber.inputs[0]), 171 * 160)

    def test_soft_speech_starts_with_prior_quiet_frames(self):
        self.push(0.001, 50)
        self.push(0.01, 30)
        self.scheduler.finish()
        self.assertEqual(len(self.events), 1)
        self.assertEqual(len(self.transcriber.inputs[0]), 50 * 160)
        np.testing.assert_allclose(self.transcriber.inputs[0][:160], 0.001)

    def test_quiet_background_alone_does_not_decode(self):
        self.push(0.001, 100)
        self.scheduler.finish()
        self.assertEqual(self.transcriber.inputs, [])

    def test_old_quiet_dip_is_not_reused_after_max_duration_split(self):
        self.push(0.02, 100)
        self.push(0.0, 1)
        self.push(0.02, 699)
        self.push(0.02, 10)
        self.scheduler.finish()
        self.assertEqual(len(self.transcriber.inputs), 2)
        self.assertEqual(len(self.transcriber.inputs[1]), 10 * 160)

    def test_stop_decodes_audio_still_waiting_in_ingress(self):
        self.push(0.02, 50, process=False)
        self.scheduler.finish()
        self.assertEqual(len(self.events), 1)
        self.assertEqual(len(self.transcriber.inputs[0]), 50 * 160)


if __name__ == "__main__":
    unittest.main()
