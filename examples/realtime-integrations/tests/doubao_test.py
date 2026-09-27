import importlib.util
import math
from pathlib import Path
import struct
import unittest

spec = importlib.util.spec_from_file_location("doubao_hook",
    Path(__file__).parents[1] / "providers" / "doubao-hook.py")
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


class DoubaoHookTest(unittest.TestCase):
    def test_explicit_float32_conversion(self):
        bridge = module.KasamilaBridge.__new__(module.KasamilaBridge)
        received = []
        bridge.audio = lambda data, rate: received.append((data, rate))
        bridge.audio_float32(struct.pack("<fff", -1, 1, 0), 24000)
        self.assertEqual(struct.unpack("<hhh", received[0][0]), (-32768, 32767, 0))
        self.assertEqual(received[0][1], 24000)

    def test_malformed_and_nonfinite_are_rejected(self):
        bridge = module.KasamilaBridge.__new__(module.KasamilaBridge)
        bridge.audio = lambda *_: self.fail("invalid audio forwarded")
        with self.assertRaises(ValueError):
            bridge.audio_float32(b"a")
        with self.assertRaises(ValueError):
            bridge.audio_float32(struct.pack("<f", math.nan))


if __name__ == "__main__":
    unittest.main()
