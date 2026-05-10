package com.driftguard.diff;

import com.driftguard.common.DriftType;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.NullNode;
import com.fasterxml.jackson.databind.node.TextNode;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import org.springframework.stereotype.Service;

@Service
public class JacksonDiffEngine implements DiffEngine {

    private static final double LATENCY_THRESHOLD = 0.20;

    private final ObjectMapper objectMapper;

    public JacksonDiffEngine(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }

    @Override
    public DiffEngineResult compare(
            int baselineStatus,
            String baselineBody,
            long baselineResponseTimeMs,
            int replayedStatus,
            String replayedBody,
            long replayedResponseTimeMs,
            List<String> ignoredPaths
    ) {
        Set<String> ignored = new HashSet<>(ignoredPaths == null ? List.of() : ignoredPaths);
        List<DiffChange> changes = new ArrayList<>();

        if (baselineStatus != replayedStatus) {
            changes.add(new DiffChange("$.__status", "STATUS_CHANGED", baselineStatus, replayedStatus));
        }

        compareNodes("$", parseBody(baselineBody), parseBody(replayedBody), ignored, changes);
        addLatencyDrift(baselineResponseTimeMs, replayedResponseTimeMs, changes);

        DriftType driftType = classify(changes);
        return new DiffEngineResult(driftType, summarize(driftType, changes), changes);
    }

    private void compareNodes(
            String path,
            JsonNode baseline,
            JsonNode replayed,
            Set<String> ignored,
            List<DiffChange> changes
    ) {
        if (isIgnored(path, ignored)) {
            return;
        }
        if (baseline == null || baseline.isMissingNode() || baseline.isNull()) {
            if (replayed != null && !replayed.isMissingNode() && !replayed.isNull()) {
                changes.add(new DiffChange(path, "FIELD_ADDED", null, printable(replayed)));
            }
            return;
        }
        if (replayed == null || replayed.isMissingNode() || replayed.isNull()) {
            changes.add(new DiffChange(path, "FIELD_REMOVED", printable(baseline), null));
            return;
        }
        if (baseline.getNodeType() != replayed.getNodeType()) {
            changes.add(new DiffChange(path, "TYPE_CHANGED", baseline.getNodeType().name(),
                    replayed.getNodeType().name()));
            return;
        }
        if (baseline.isObject()) {
            compareObjects(path, baseline, replayed, ignored, changes);
            return;
        }
        if (baseline.isArray()) {
            compareArrays(path, baseline, replayed, ignored, changes);
            return;
        }
        if (!baseline.equals(replayed)) {
            changes.add(new DiffChange(path, "VALUE_CHANGED", printable(baseline), printable(replayed)));
        }
    }

    private void compareObjects(
            String path,
            JsonNode baseline,
            JsonNode replayed,
            Set<String> ignored,
            List<DiffChange> changes
    ) {
        Set<String> fields = new LinkedHashSet<>();
        baseline.fieldNames().forEachRemaining(fields::add);
        replayed.fieldNames().forEachRemaining(fields::add);

        for (String field : fields) {
            compareNodes(path + "." + field, baseline.get(field), replayed.get(field), ignored, changes);
        }
    }

    private void compareArrays(
            String path,
            JsonNode baseline,
            JsonNode replayed,
            Set<String> ignored,
            List<DiffChange> changes
    ) {
        if (canMatchById(baseline) && canMatchById(replayed)) {
            compareArraysById(path, baseline, replayed, ignored, changes);
            return;
        }
        int max = Math.max(baseline.size(), replayed.size());
        for (int i = 0; i < max; i++) {
            compareNodes(path + "[" + i + "]", baseline.get(i), replayed.get(i), ignored, changes);
        }
    }

    private void compareArraysById(
            String path,
            JsonNode baseline,
            JsonNode replayed,
            Set<String> ignored,
            List<DiffChange> changes
    ) {
        Map<String, JsonNode> baselineById = indexById(baseline);
        Map<String, JsonNode> replayedById = indexById(replayed);
        Set<String> ids = new LinkedHashSet<>();
        ids.addAll(baselineById.keySet());
        ids.addAll(replayedById.keySet());

        for (String id : ids) {
            String itemPath = path + "[id=" + id + "]";
            JsonNode baselineItem = baselineById.get(id);
            JsonNode replayedItem = replayedById.get(id);
            if (baselineItem == null) {
                changes.add(new DiffChange(itemPath, "FIELD_ADDED", null, printable(replayedItem)));
                continue;
            }
            if (replayedItem == null) {
                changes.add(new DiffChange(itemPath, "FIELD_REMOVED", printable(baselineItem), null));
                continue;
            }
            compareNodes(itemPath, baselineItem, replayedItem, ignored, changes);
        }
    }

    private boolean canMatchById(JsonNode array) {
        if (!array.isArray() || array.isEmpty()) {
            return false;
        }
        Set<String> ids = new HashSet<>();
        for (JsonNode item : array) {
            JsonNode id = item.get("id");
            if (!item.isObject() || id == null || id.isNull() || id.isContainerNode()) {
                return false;
            }
            if (!ids.add(id.asText())) {
                return false;
            }
        }
        return true;
    }

    private Map<String, JsonNode> indexById(JsonNode array) {
        Map<String, JsonNode> indexed = new LinkedHashMap<>();
        for (JsonNode item : array) {
            indexed.put(item.get("id").asText(), item);
        }
        return indexed;
    }

    private void addLatencyDrift(long baselineMs, long replayedMs, List<DiffChange> changes) {
        if (baselineMs <= 0) {
            return;
        }
        double delta = (replayedMs - baselineMs) / (double) baselineMs;
        if (delta > LATENCY_THRESHOLD) {
            changes.add(new DiffChange("$.__latency_ms", "LATENCY_REGRESSION", baselineMs, replayedMs));
        }
    }

    private DriftType classify(List<DiffChange> changes) {
        if (changes.isEmpty()) {
            return DriftType.NONE;
        }
        if (changes.stream().anyMatch(this::isBreaking)) {
            return DriftType.BREAKING;
        }
        boolean onlyLatency = changes.stream()
                .allMatch(change -> "LATENCY_REGRESSION".equals(change.type()));
        if (onlyLatency) {
            return DriftType.PERFORMANCE;
        }
        return DriftType.WARNING;
    }

    private boolean isBreaking(DiffChange change) {
        return "STATUS_CHANGED".equals(change.type())
                || "FIELD_REMOVED".equals(change.type())
                || "TYPE_CHANGED".equals(change.type());
    }

    private String summarize(DriftType driftType, List<DiffChange> changes) {
        if (driftType == DriftType.NONE) {
            return "No drift detected";
        }
        return driftType + " drift detected: " + changes.size() + " change(s)";
    }

    private boolean isIgnored(String path, Set<String> ignored) {
        if (ignored.contains(path)) {
            return true;
        }
        return ignored.stream()
                .filter(rule -> rule.contains("[*]"))
                .anyMatch(rule -> path.matches(toWildcardRegex(rule)));
    }

    private String toWildcardRegex(String rule) {
        StringBuilder regex = new StringBuilder("^");
        for (int i = 0; i < rule.length(); i++) {
            if (i + 2 < rule.length() && rule.charAt(i) == '['
                    && rule.charAt(i + 1) == '*' && rule.charAt(i + 2) == ']') {
                regex.append("\\[(?:\\d+|id=[^\\]]+)\\]");
                i += 2;
                continue;
            }
            char value = rule.charAt(i);
            if ("\\.[]{}()+-^$?|".indexOf(value) >= 0) {
                regex.append('\\');
            }
            regex.append(value);
        }
        return regex.append('$').toString();
    }

    private JsonNode parseBody(String body) {
        if (body == null || body.isBlank()) {
            return NullNode.getInstance();
        }
        try {
            return objectMapper.readTree(body);
        } catch (Exception ex) {
            return TextNode.valueOf(body);
        }
    }

    private Object printable(JsonNode node) {
        if (node == null || node.isNull()) {
            return null;
        }
        if (node.isNumber()) {
            return node.numberValue();
        }
        if (node.isBoolean()) {
            return node.booleanValue();
        }
        if (node.isTextual()) {
            return node.textValue();
        }
        return node.toString();
    }
}
