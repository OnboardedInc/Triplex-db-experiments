import java.nio.file.Path;
import java.util.stream.Collectors;
import jdk.jfr.consumer.RecordingFile;

// [DX-W1] Why: truncated JSON stacks omit callers below the decoder. Join the full recording to the sealed export by thread and nanosecond duration.
// Rejected: assigning every AVET miss to the new-ID check or calling a thresholded park a count of all SQL reads.
class Parks {
    public static void main(String[] args) throws Exception {
        try (var recording = new RecordingFile(Path.of(args[0]))) {
            while (recording.hasMoreEvents()) {
                var e = recording.readEvent();
                if (!e.getEventType().getName().equals("jdk.ThreadPark") || e.getDuration().toNanos() < 5_000_000L
                    || e.getThread() == null || !e.getThread().getJavaName().startsWith("processor-") || e.getStackTrace() == null) continue;
                var stack = e.getStackTrace().getFrames().stream().map(f -> f.getMethod().getType().getName()+"/"+f.getMethod().getName()).collect(Collectors.joining(" "));
                if (!stack.contains("DeserializingRepairingLookup")) continue;
                var kind = stack.contains("identity_row") ? "newIdentity" : stack.contains("row_id") && stack.contains("seekEAVT") ? "retirementMarker"
                    : stack.contains("row_id") && stack.contains("seekAVET") ? "oldLiveRow" : stack.contains("Db/addData") && stack.contains("seekAEVT") ? "nativeApply" : "unassigned";
                System.out.println(e.getThread().getJavaName()+"\t"+e.getDuration().toNanos()+"\t"+kind);
            }
        }
    }
}
