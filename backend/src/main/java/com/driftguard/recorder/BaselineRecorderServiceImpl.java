package com.driftguard.recorder;

import com.driftguard.common.PageResponse;
import com.driftguard.common.ResourceNotFoundException;
import com.driftguard.redaction.RedactedHttpExchange;
import com.driftguard.redaction.RedactionRuleService;
import com.driftguard.service.RegisteredService;
import com.driftguard.service.ServiceRepository;
import java.util.Locale;
import java.util.UUID;
import org.springframework.data.domain.Pageable;
import org.springframework.transaction.annotation.Transactional;

@org.springframework.stereotype.Service
public class BaselineRecorderServiceImpl implements BaselineRecorderService {

    private final BaselineRepository baselineRepository;
    private final ServiceRepository serviceRepository;
    private final RedactionRuleService redactionRuleService;

    public BaselineRecorderServiceImpl(
            BaselineRepository baselineRepository,
            ServiceRepository serviceRepository,
            RedactionRuleService redactionRuleService
    ) {
        this.baselineRepository = baselineRepository;
        this.serviceRepository = serviceRepository;
        this.redactionRuleService = redactionRuleService;
    }

    @Override
    @Transactional
    public BaselineResponse record(UUID serviceId, RecordBaselineRequest request) {
        RegisteredService service = serviceRepository.findById(serviceId)
                .orElseThrow(() -> new ResourceNotFoundException("Service not found: " + serviceId));
        RedactedHttpExchange redacted = redactionRuleService.redactExchange(
                serviceId,
                request.requestHeaders(),
                request.requestBody(),
                request.responseHeaders(),
                request.responseBody()
        );
        Baseline baseline = new Baseline(
                service,
                request.method().trim().toUpperCase(Locale.ROOT),
                request.path().trim(),
                redacted.requestHeaders(),
                redacted.requestBody(),
                request.responseStatus(),
                redacted.responseHeaders(),
                redacted.responseBody(),
                request.responseTimeMs()
        );
        return BaselineResponse.fromEntity(baselineRepository.saveAndFlush(baseline));
    }

    @Override
    @Transactional(readOnly = true)
    public PageResponse<BaselineResponse> list(UUID serviceId, Pageable pageable) {
        ensureServiceExists(serviceId);
        return PageResponse.from(baselineRepository.findByService_Id(serviceId, pageable)
                .map(BaselineResponse::fromEntity));
    }

    @Override
    @Transactional(readOnly = true)
    public BaselineResponse get(UUID serviceId, UUID baselineId) {
        return BaselineResponse.fromEntity(findForService(serviceId, baselineId));
    }

    @Override
    @Transactional
    public void delete(UUID serviceId, UUID baselineId) {
        baselineRepository.delete(findForService(serviceId, baselineId));
    }

    private Baseline findForService(UUID serviceId, UUID baselineId) {
        Baseline baseline = baselineRepository.findById(baselineId)
                .orElseThrow(() -> new ResourceNotFoundException("Baseline not found: " + baselineId));
        if (!baseline.getService().getId().equals(serviceId)) {
            throw new ResourceNotFoundException("Baseline not found for service: " + serviceId);
        }
        return baseline;
    }

    private void ensureServiceExists(UUID serviceId) {
        if (!serviceRepository.existsById(serviceId)) {
            throw new ResourceNotFoundException("Service not found: " + serviceId);
        }
    }
}
