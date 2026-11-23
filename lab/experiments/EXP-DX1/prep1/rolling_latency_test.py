import unittest

from rolling_latency import PhaseLatency, excess, spans


class RollingLatencyTest(unittest.TestCase):
    def setUp(self):
        self.row = dict(id="quiet", account=0, due=0, creditGranted=60, sent=61, end=84,
                        neighboursAhead=1, ack={"timeline": dict(payloadPrepared=2000, predecessorReady=3000,
                                                                 completed=20000, responsePrepared=21000)})
        self.block = {"start": 79_000_000, "end": 80_000_000}
        self.member = {"read-at": 66_000_000, "started-at": 76_000_000, "applied-at": 78_000_000}
        self.phase = dict(phaseStartNs="0", phaseWallMs=10, seconds=300, rows=[self.row])

    def test_excess_and_interference_use_the_same_clock(self):
        ledger = PhaseLatency(self.phase, {"gw-w": [(80, 86, "pause")]})
        ledger.applies = [(68, 75, 2)]
        ledger.add(self.row, self.block, self.member)
        out = ledger.finished()
        slow = out["excessMs"]["firstHalf"]
        self.assertEqual(slow["creditQueue"], 10)
        self.assertEqual(slow["nativeQueue"], 10)
        self.assertEqual(slow["prepare"], 2)
        self.assertEqual(slow["append"], 1)
        self.assertEqual(sum(slow.values()), 34)
        q = out["quietP99RankAndAbove"]["whole"][0]
        self.assertEqual(q["overlappingNeighbourApplyInNativeQueueMs"], 7)
        self.assertEqual(q["pauseOverlapMs"], {"gw-w": 6})

    def test_unalignable_http_retains_the_whole_latency(self):
        self.row["ack"]["timeline"]["responsePrepared"] = 40_000
        parts = spans(self.phase, self.row, self.block, self.member)
        self.assertEqual(excess(parts, 0, 84), {"creditQueue": 10, "senderEncode": 1, "unalignedHttp": 23})


if __name__ == "__main__":
    unittest.main()
