package com.driftguard.redaction;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.fasterxml.jackson.databind.node.TextNode;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.springframework.stereotype.Component;

@Component
public class RedactionEngine {

    private static final String REDACTED = "[REDACTED]";
    private final ObjectMapper objectMapper;

    public RedactionEngine(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }

    public Map<String, Object> redactHeaders(Map<String, Object> headers, List<RedactionRule> rules) {
        if (headers == null || headers.isEmpty() || rules.isEmpty()) {
            return headers == null ? Map.of() : headers;
        }
        JsonNode node = objectMapper.valueToTree(headers);
        applyRules(node, rules);
        return objectMapper.convertValue(node, objectMapper.getTypeFactory()
                .constructMapType(LinkedHashMap.class, String.class, Object.class));
    }

    public String redactBody(String body, List<RedactionRule> rules) {
        if (body == null || body.isBlank() || rules.isEmpty()) {
            return body;
        }
        try {
            JsonNode node = objectMapper.readTree(body);
            applyRules(node, rules);
            return objectMapper.writeValueAsString(node);
        } catch (Exception ex) {
            return body;
        }
    }

    private void applyRules(JsonNode node, List<RedactionRule> rules) {
        for (RedactionRule rule : rules) {
            apply(node, tokens(rule.getFieldPath()), 0, rule.getRuleType());
        }
    }

    private void apply(JsonNode node, List<String> tokens, int index, RedactionRuleType type) {
        if (node == null || index >= tokens.size()) {
            return;
        }
        String token = tokens.get(index);
        boolean leaf = index == tokens.size() - 1;

        if (node.isObject()) {
            ObjectNode object = (ObjectNode) node;
            if (!object.has(token)) {
                return;
            }
            if (leaf) {
                redactObjectField(object, token, type);
                return;
            }
            apply(object.get(token), tokens, index + 1, type);
            return;
        }

        if (node.isArray()) {
            ArrayNode array = (ArrayNode) node;
            if ("*".equals(token)) {
                for (JsonNode item : array) {
                    apply(item, tokens, index + 1, type);
                }
                return;
            }
            try {
                int position = Integer.parseInt(token);
                if (position >= 0 && position < array.size()) {
                    apply(array.get(position), tokens, index + 1, type);
                }
            } catch (NumberFormatException ignored) {
            }
        }
    }

    private void redactObjectField(ObjectNode object, String field, RedactionRuleType type) {
        JsonNode current = object.get(field);
        if (current == null) {
            return;
        }
        switch (type) {
            case DROP -> object.remove(field);
            case HASH -> object.set(field, TextNode.valueOf("[HASH:" + hash(current.asText()) + "]"));
            case REDACT -> object.set(field, TextNode.valueOf(REDACTED));
        }
    }

    private List<String> tokens(String path) {
        String clean = path == null ? "" : path.trim();
        if (clean.startsWith("$.")) {
            clean = clean.substring(2);
        } else if (clean.startsWith("$")) {
            clean = clean.substring(1);
        }
        List<String> result = new ArrayList<>();
        for (String part : clean.split("\\.")) {
            if (part.isBlank()) {
                continue;
            }
            splitArrayTokens(part, result);
        }
        return result;
    }

    private void splitArrayTokens(String value, List<String> result) {
        int bracket = value.indexOf('[');
        if (bracket < 0) {
            result.add(value);
            return;
        }
        if (bracket > 0) {
            result.add(value.substring(0, bracket));
        }
        int end = value.indexOf(']', bracket);
        if (end > bracket) {
            result.add(value.substring(bracket + 1, end));
        }
    }

    private String hash(String value) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hashed = digest.digest(value.getBytes(StandardCharsets.UTF_8));
            StringBuilder builder = new StringBuilder();
            for (int i = 0; i < 6 && i < hashed.length; i++) {
                builder.append("%02x".formatted(hashed[i]));
            }
            return builder.toString();
        } catch (Exception ex) {
            return "unavailable";
        }
    }
}
