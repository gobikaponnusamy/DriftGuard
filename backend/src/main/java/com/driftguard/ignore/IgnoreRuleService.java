package com.driftguard.ignore;

import java.util.List;
import java.util.UUID;

public interface IgnoreRuleService {

    IgnoreRuleResponse add(UUID serviceId, AddIgnoreRuleRequest request);

    List<IgnoreRuleResponse> list(UUID serviceId);

    List<String> fieldPathsForService(UUID serviceId);

    void delete(UUID serviceId, UUID ruleId);
}
