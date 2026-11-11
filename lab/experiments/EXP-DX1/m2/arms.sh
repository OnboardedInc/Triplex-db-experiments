#!/usr/bin/env bash
# [DX-M2] Why: source explicit options per arm without changing stack defaults. Rejected: global GC tuning.
# Source: R3 sections A/B; https://docs.datomic.com/operation/capacity.html
m2_arm=${1:?A|B|C|D}; m2_gateway=${2:-50}
[[ $m2_gateway == 20 || $m2_gateway == 50 ]] || return 2
m2_gc='-Xlog:gc*,safepoint:file=/tmp/gc.log:time,uptime:filecount=2,filesize=10M'
export DX_TX_MEMORY=4g DX_GW_WRITE_MEMORY=3g DX_GW_READ_MEMORY=3g DX_PG_MEMORY=2g
export DX_INDEX_THRESHOLD=256m DX_INDEX_MAX=1g DX_OBJECT_CACHE=1g DX_TX_OBJECT_CACHE=1g
case $m2_arm in
 A) DX_TX_JAVA_OPTS='-Xms256m -Xmx3g';;
 B) DX_TX_JAVA_OPTS='-Xms3g -Xmx3g -XX:+UseG1GC -XX:MaxGCPauseMillis=50';;
 C) DX_TX_JAVA_OPTS='-Xms3g -Xmx3g -XX:+UseG1GC -XX:MaxGCPauseMillis=20 -XX:+AlwaysPreTouch'; DX_OBJECT_CACHE=256m; DX_TX_OBJECT_CACHE=256m;;
 # [DX-M2] Why: a bounded young generation limits live evacuation work. Rejected: ZGC before verifying Java 25.
 D) DX_TX_JAVA_OPTS='-Xms3g -Xmx3g -XX:+UseG1GC -XX:MaxGCPauseMillis=20 -XX:+AlwaysPreTouch -XX:+UnlockExperimentalVMOptions -XX:G1MaxNewSizePercent=20'; DX_OBJECT_CACHE=256m; DX_TX_OBJECT_CACHE=256m;;
 *) return 2;;
esac
export DX_TX_JAVA_OPTS="$DX_TX_JAVA_OPTS $m2_gc"
export DX_GW_WRITE_JAVA_OPTS="-Xms1g -Xmx2g -XX:+UseG1GC -XX:MaxGCPauseMillis=$m2_gateway -Ddatomic.objectCacheMax=1g $m2_gc"
