package com.driftguard.redaction;

import com.driftguard.common.ResourceNotFoundException;
import com.driftguard.service.RegisteredService;
import com.driftguard.service.ServiceRepository;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.transaction.annotation.Transactional;

@org.springframework.stereotype.Service
public class RedactionRuleServiceImpl implements RedactionRuleService {

    private final RedactionRuleRepository ruleRepository;
    private final ServiceRepository serviceRepository;
    private final RedactionEngine redactionEngine;

    public RedactionRuleServiceImpl(
            RedactionRuleRepository ruleRepository,
            ServiceRepository serviceRepository,
            RedactionEngine redactionEngine
    ) {
        this.ruleRepository = ruleRepository;
        this.serviceRepository = serviceRepository;
        this.redactionEngine = redactionEngine;
    }

    @Override
    @Transactional
    public RedactionRuleResponse add(UUID serviceId, AddRedactionRuleRequest request) {
        RegisteredService service = serviceRepository.findById(serviceId)
                .orElseThrow(() -> new ResourceNotFoundException("Service not found: " + serviceId));
        RedactionRule rule = new RedactionRule(service, request.fieldPath().trim(), request.ruleType());
        return RedactionRuleResponse.fromEntity(ruleRepository.saveAndFlush(rule));
    }

    @Override
    @Transactional(readOnly = true)
    public List<RedactionRuleResponse> list(UUID serviceId) {
        ensureServiceExists(serviceId);
        return rules(serviceId).stream().map(RedactionRuleResponse::fromEntity).toList();
    }

    @Override
    @Transactional
    public void delete(UUID serviceId, UUID ruleId) {
        RedactionRule rule = ruleRepository.findById(ruleId)
                .orElseThrow(() -> new ResourceNotFoundException("Redaction rule not found: " + ruleId));
        if (!rule.getService().getId().equals(serviceId)) {
            throw new ResourceNotFoundException("Redaction rule not found for service: " + serviceId);
        }
        ruleRepository.delete(rule);
    }

    @Override
    @Transactional(readOnly = true)
    public RedactedHttpExchange redactExchange(
            UUID serviceId,
            Map<String, Object> requestHeaders,
            String requestBody,
            Map<String, Object> responseHeaders,
            String responseBody
    ) {
        List<RedactionRule> rules = rules(serviceId);
        return new RedactedHttpExchange(
                redactionEngine.redactHeaders(requestHeaders, rules),
                redactionEngine.redactBody(requestBody, rules),
                redactionEngine.redactHeaders(responseHeaders, rules),
                redactionEngine.redactBody(responseBody, rules)
        );
    }

    private List<RedactionRule> rules(UUID serviceId) {
        return ruleRepository.findByService_IdOrderByCreatedAtDesc(serviceId);
    }

    private void ensureServiceExists(UUID serviceId) {
        if (!serviceRepository.existsById(serviceId)) {
            throw new ResourceNotFoundException("Service not found: " + serviceId);
        }
    }
}
