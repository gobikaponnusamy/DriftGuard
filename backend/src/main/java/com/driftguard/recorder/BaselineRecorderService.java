package com.driftguard.recorder;

import com.driftguard.common.PageResponse;
import java.util.UUID;
import org.springframework.data.domain.Pageable;

public interface BaselineRecorderService {

    BaselineResponse record(UUID serviceId, RecordBaselineRequest request);

    PageResponse<BaselineResponse> list(UUID serviceId, Pageable pageable);

    BaselineResponse get(UUID serviceId, UUID baselineId);

    BaselineResponse update(UUID serviceId, UUID baselineId, RecordBaselineRequest request);

    void delete(UUID serviceId, UUID baselineId);
}
