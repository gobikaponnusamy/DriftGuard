package com.driftguard.diff;

import static org.assertj.core.api.Assertions.assertThat;

import com.driftguard.common.DriftType;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

class JacksonDiffEngineTest {

    private JacksonDiffEngine diffEngine;

    @BeforeEach
    void setUp() {
        diffEngine = new JacksonDiffEngine(new ObjectMapper());
    }

    @Test
    void classifiesIdenticalResponsesAsNone() {
        DiffEngineResult result = diffEngine.compare(
                200,
                "{\"price\":99,\"timestamp\":\"a\"}",
                100,
                200,
                "{\"price\":99,\"timestamp\":\"b\"}",
                110,
                List.of("$.timestamp")
        );

        assertThat(result.driftType()).isEqualTo(DriftType.NONE);
        assertThat(result.drifts()).isEmpty();
    }

    @Test
    void classifiesStatusChangeAsBreaking() {
        DiffEngineResult result = diffEngine.compare(200, "{\"ok\":true}", 100,
                500, "{\"ok\":true}", 100, List.of());

        assertThat(result.driftType()).isEqualTo(DriftType.BREAKING);
        assertThat(result.drifts()).extracting(DiffChange::type)
                .contains("STATUS_CHANGED");
    }

    @Test
    void classifiesMissingFieldAsBreaking() {
        DiffEngineResult result = diffEngine.compare(200, "{\"price\":99}", 100,
                200, "{}", 100, List.of());

        assertThat(result.driftType()).isEqualTo(DriftType.BREAKING);
        assertThat(result.drifts()).extracting(DiffChange::type)
                .contains("FIELD_REMOVED");
    }

    @Test
    void classifiesTypeChangeAsBreaking() {
        DiffEngineResult result = diffEngine.compare(200, "{\"price\":99}", 100,
                200, "{\"price\":\"99\"}", 100, List.of());

        assertThat(result.driftType()).isEqualTo(DriftType.BREAKING);
        assertThat(result.drifts()).extracting(DiffChange::type)
                .contains("TYPE_CHANGED");
    }

    @Test
    void classifiesValueChangeAsWarning() {
        DiffEngineResult result = diffEngine.compare(200, "{\"price\":99}", 100,
                200, "{\"price\":100}", 100, List.of());

        assertThat(result.driftType()).isEqualTo(DriftType.WARNING);
        assertThat(result.drifts()).extracting(DiffChange::type)
                .contains("VALUE_CHANGED");
    }

    @Test
    void classifiesOnlyLatencyRegressionAsPerformance() {
        DiffEngineResult result = diffEngine.compare(200, "{\"price\":99}", 100,
                200, "{\"price\":99}", 130, List.of());

        assertThat(result.driftType()).isEqualTo(DriftType.PERFORMANCE);
        assertThat(result.drifts()).extracting(DiffChange::type)
                .containsExactly("LATENCY_REGRESSION");
    }

    @Test
    void ignoresWildcardArrayPaths() {
        DiffEngineResult result = diffEngine.compare(
                200,
                "{\"items\":[{\"id\":\"sku_1\",\"timestamp\":\"a\",\"price\":10}]}",
                100,
                200,
                "{\"items\":[{\"id\":\"sku_1\",\"timestamp\":\"b\",\"price\":10}]}",
                100,
                List.of("$.items[*].timestamp")
        );

        assertThat(result.driftType()).isEqualTo(DriftType.NONE);
        assertThat(result.drifts()).isEmpty();
    }

    @Test
    void matchesArrayObjectsByIdInsteadOfIndex() {
        DiffEngineResult result = diffEngine.compare(
                200,
                "{\"items\":[{\"id\":\"sku_1\",\"name\":\"A\"},{\"id\":\"sku_2\",\"name\":\"B\"}]}",
                100,
                200,
                "{\"items\":[{\"id\":\"sku_2\",\"name\":\"B\"},{\"id\":\"sku_1\",\"name\":\"A\"}]}",
                100,
                List.of()
        );

        assertThat(result.driftType()).isEqualTo(DriftType.NONE);
        assertThat(result.drifts()).isEmpty();
    }

    @Test
    void reportsArrayObjectValueChangeAtStableIdPath() {
        DiffEngineResult result = diffEngine.compare(
                200,
                "{\"items\":[{\"id\":\"sku_1\",\"name\":\"A\"}]}",
                100,
                200,
                "{\"items\":[{\"id\":\"sku_1\",\"name\":\"B\"}]}",
                100,
                List.of()
        );

        assertThat(result.driftType()).isEqualTo(DriftType.WARNING);
        assertThat(result.drifts()).extracting(DiffChange::path)
                .contains("$.items[id=sku_1].name");
    }

    @Test
    void reportsMissingArrayObjectAsBreaking() {
        DiffEngineResult result = diffEngine.compare(
                200,
                "{\"items\":[{\"id\":\"sku_1\",\"name\":\"A\"}]}",
                100,
                200,
                "{\"items\":[]}",
                100,
                List.of()
        );

        assertThat(result.driftType()).isEqualTo(DriftType.BREAKING);
        assertThat(result.drifts()).extracting(DiffChange::type)
                .contains("FIELD_REMOVED");
    }
}
