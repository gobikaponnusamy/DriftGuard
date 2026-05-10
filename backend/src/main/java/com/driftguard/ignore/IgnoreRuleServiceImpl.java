package com.driftguard.ignore;

import com.driftguard.common.ResourceNotFoundException;
import com.driftguard.service.RegisteredService;
import com.driftguard.service.ServiceRepository;
import java.util.List;
import java.util.UUID;
import org.springframework.transaction.annotation.Transactional;

@org.springframework.stereotype.Service
public class IgnoreRuleServiceImpl implements IgnoreRuleService {

    private final IgnoreRuleRepository ignoreRuleRepository;
    private final ServiceRepository serviceRepository;

    public IgnoreRuleServiceImpl(
            IgnoreRuleRepository ignoreRuleRepository,
            ServiceRepository serviceRepository
    ) {
        this.ignoreRuleRepository = ignoreRuleRepository;
        this.serviceRepository = serviceRepository;
    }

    @Override
    @Transactional
    public IgnoreRuleResponse add(UUID serviceId, AddIgnoreRuleRequest request) {
        RegisteredService service = serviceRepository.findById(serviceId)
                .orElseThrow(() -> new ResourceNotFoundException("Service not found: " + serviceId));
        IgnoreRule rule = new IgnoreRule(
                service,
                request.fieldPath().trim(),
                request.ruleType()
        );
        return IgnoreRuleResponse.fromEntity(ignoreRuleRepository.saveAndFlush(rule));
    }

    @Override
    @Transactional(readOnly = true)
    public List<IgnoreRuleResponse> list(UUID serviceId) {
        ensureServiceExists(serviceId);
        return ignoreRuleRepository.findByService_IdOrderByCreatedAtDesc(serviceId).stream()
                .map(IgnoreRuleResponse::fromEntity)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public List<String> fieldPathsForService(UUID serviceId) {
        return ignoreRuleRepository.findByService_IdOrderByCreatedAtDesc(serviceId).stream()
                .map(IgnoreRule::getFieldPath)
                .toList();
    }

    @Override
    @Transactional
    public void delete(UUID serviceId, UUID ruleId) {
        IgnoreRule rule = ignoreRuleRepository.findById(ruleId)
                .orElseThrow(() -> new ResourceNotFoundException("Ignore rule not found: " + ruleId));
        if (!rule.getService().getId().equals(serviceId)) {
            throw new ResourceNotFoundException("Ignore rule not found for service: " + serviceId);
        }
        ignoreRuleRepository.delete(rule);
    }

    private void ensureServiceExists(UUID serviceId) {
        if (!serviceRepository.existsById(serviceId)) {
            throw new ResourceNotFoundException("Service not found: " + serviceId);
        }
    }
}
