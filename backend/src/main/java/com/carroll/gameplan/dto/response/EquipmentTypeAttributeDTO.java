package com.carroll.gameplan.dto.response;

import java.util.List;

/**
 * Data Transfer Object representing a single attribute of an equipment type.
 * <p>
 * Each attribute has a name and a list of allowed options. For example:
 * <pre>
 * { name: "size", options: ["S", "M", "L"] }
 * </pre>
 * </p>
 * @param name    Name of the attribute
 * @param options Allowed options for this attribute
 */
public record EquipmentTypeAttributeDTO(String name, List<String> options) {
}