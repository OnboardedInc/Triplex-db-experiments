# What should happen to saves after a machine fails?

**One-line reply** `Choose A`, `Choose B`, or `Choose C`. **I recommend C.** It is the only option designed to resume within 60 seconds while keeping two copies of every new save. Until a third machine and the fence have been tested, I would choose B for production and accept the longer pause in saves. [Confirmed targets](../../../TARGETS.md) · [Fence design](FENCE.md)

## A. Reopen on one copy and raise an alarm

People can still read the database. Saves show as pending during the switch and can finish once the surviving machine takes over. We expect saves to resume in 12–38 seconds with a working fence. The first failure preserves all earlier confirmed saves. A second failure before the replacement catches up can erase every save confirmed during the one-copy window. If both disks are destroyed, earlier saves depend on backups.

The small Mac run spent 17.59 seconds on one copy. With a spare ready, making a fresh copy is forecast to take 45–180 seconds at 16 million facts and 7–27 minutes at 160 million. Waiting for a spare adds to that time. Extra standing machine cost is **$0/month**. This can meet the 60-second and read targets after the first failure. It cannot promise zero loss on the next failure while it is accepting one-copy saves. [Mac evidence](EVIDENCE.md) · [Copy forecast](FENCE.md)

## B. Keep saves pending until a second copy is ready

People can still read the database. New saves remain pending or are refused until a replacement has caught up, then the client resends them. The one-copy period is the same as in A. Saves are refused through takeover and the rebuild, which can exceed 60 seconds at 16 million facts and is forecast at minutes at 160 million. A second failure can destroy or strand the earlier data on the last disk. It cannot erase a newly confirmed save because saves stayed pending. Extra standing machine cost is **$0/month**. This protects the zero-loss bar for the first failure and keeps reads available when the survivor is healthy. [Copy and recovery evidence](FENCE.md)

## C. Keep three data machines ready

People can still read while the two survivors switch writers. Saves are expected to resume in 18–40 seconds at 16 million facts and 20–50 seconds at 160 million, with both survivors required to record each new save. The one-copy period after a single failure is **zero**. A replacement can copy in the background. Once both survivors have caught up, either can fail and the other still has all confirmed saves. At that point new saves pause again. A second failure during the first switch can leave the last machine behind if healthy saves originally waited for only one of the two backups. Waiting for all three copies in healthy service can close that exposure and adds latency that needs its own test. The zero-loss, 60-second and read bars are the design targets for a single failure. The third machine costs **about $314/month** in the example below. [PostgreSQL synchronous replication](https://www.postgresql.org/docs/17/warm-standby.html#SYNCHRONOUS-REPLICATION) · [Promotion and fence design](FENCE.md)

## Planned moves and prices

A planned move starts with copies already in sync. The two-machine Mac move paused saves for 13.56 seconds. We forecast 18–30 seconds at 16 million facts and 21–40 seconds at 160 million. All three choices can use planned moves. The 30-second bar at 160 million remains open. [Move evidence and forecasts](REPORT.md)

The example price is a Google Compute Engine N2 machine in Iowa with eight virtual cores, 32 GiB of memory and 300 GiB of balanced disk. At published on-demand prices, 730 hours at $0.388472 plus $30 for disk is about $314 a month. A short overlap during a replacement costs about $0.43 per hour in this example. Backups, data transfer, independent fence hardware and any taxes are separate. Actual sizing depends on how many systems share the machines. [Compute Engine prices](https://cloud.google.com/products/compute/pricing/general-purpose) · [Disk prices](https://cloud.google.com/products/block-storage)

## What hosted databases do

Amazon Aurora keeps six storage copies across three zones by default. For fast writer takeover, customers provision a ready replica. An Amazon RDS Multi-AZ DB cluster has three data instances, waits for at least one of its two readers on each commit, and reports typical failover under 35 seconds. Google Cloud SQL starts at zonal availability when no availability type is specified. With regional HA selected, it writes to both zones before confirming the save. These services put a second durable copy on the write path when they offer this level of protection. [Aurora storage](https://docs.aws.amazon.com/rds/latest/auroraextendedcontent/aurora-faq-availability-and-durability.html) · [Aurora writer takeover](https://docs.aws.amazon.com/rds/latest/auroraextendedcontent/aurora-features-availability.html) · [RDS Multi-AZ design](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/multi-az-db-clusters-concepts.html) · [RDS timings](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/multi-az-db-clusters-concepts-failover.html) · [Cloud SQL default](https://docs.cloud.google.com/sql/docs/postgres/configure-private-service-connect) · [Cloud SQL regional HA](https://docs.cloud.google.com/sql/docs/postgres/high-availability)
