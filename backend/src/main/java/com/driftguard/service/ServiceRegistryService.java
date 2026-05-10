package com.driftguard.service;

import java.util.List;

public interface ServiceRegistryService {

    ServiceRegistrationResponse register(RegisterServiceRequest request);

    List<RegisteredServiceResponse> list();
}
