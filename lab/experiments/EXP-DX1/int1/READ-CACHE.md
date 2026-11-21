# Read cache and the P7 slope

P7 specifies “Resident bytes per never-touched subject” and a limit of 64 bytes outside PostgreSQL. [Targets §1.2](../../../TARGETS.md)
Report total RSS and actual cache charge per role at both rungs. Use matched fixed-touch rungs with similar cache occupancy to isolate population growth.
An already-full bounded cache is a fixed cost at that setting. A filling cache affects observed RSS. Show its charge separately and leave attribution open rather than subtracting weight from RSS.
The full server default is 1,536 MiB, the effective fresh-card control with a 3 GiB heap. It preserves the tested read control pending the tuned server comparison.
Use `--read-cache-mib 32` for the small-cache sensitivity check or `--read-cache-mib 3072` for the large-cache profile with a 6 GiB heap. The read study names its 3,072 MiB treatment explicitly.

The queued realistic runner at `a36c88e6c` passes no read role cache override. Its 3 GiB read heap uses the native setting, approximately 1.5 GiB as observed in the fresh archive. Check the effective charge and cap from that boot. That runner predates the 32 MiB INT1 change. Both rungs keep their original pins and report the raw slope. Any occupancy difference belongs beside the RSS result.

The Part 11 0–50 B forecast applies to a future 32 MiB comparison. It is not a forecast for the pinned realistic run or a claim that the aggregate P7 bar is met. Neither a lab GC pause nor a smaller memory limit settles P1 or P4. See the [full-size reader comparison](../rd1/FULLSIZE-SERVER.md).
