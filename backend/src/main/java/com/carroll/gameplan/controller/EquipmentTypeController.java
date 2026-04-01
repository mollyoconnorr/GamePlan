package com.carroll.gameplan.controller;

import com.carroll.gameplan.dto.CreateEquipmentTypeRequest;
import com.carroll.gameplan.dto.EquipmentAttributeDTO;
import com.carroll.gameplan.dto.EquipmentTypeAttributeDTO;
import com.carroll.gameplan.dto.EquipmentTypeDTO;
import com.carroll.gameplan.dto.EquipmentTypeUpdateRequest;
import com.carroll.gameplan.dto.EquipmentWithReservationsDTO;
import com.carroll.gameplan.model.User;
import com.carroll.gameplan.service.EquipmentTypeService;
import com.carroll.gameplan.service.UserService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.oauth2.client.authentication.OAuth2AuthenticationToken;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * REST controller for managing Equipment Types.
 * <p>
 * Provides endpoints for listing, creating, deleting, and retrieving attributes
 * for equipment types, as well as listing equipment of a specific type.
 * </p>
 */
@RestController
@RequestMapping("/api/equipment-types")
public class EquipmentTypeController {

    private final EquipmentTypeService equipmentTypeService;
    private final UserService userService;

    /**
     * Constructor for EquipmentTypeController.
     *
     * @param equipmentTypeService Service layer for EquipmentType business logic
     * @param userService          Service for user resolution and authorization
     */
    public EquipmentTypeController(EquipmentTypeService equipmentTypeService,
                                   UserService userService) {
        this.equipmentTypeService = equipmentTypeService;
        this.userService = userService;
    }

    /**
     * GET /api/equipment-types
     * <p>
     * Returns a list of all equipment types.
     *
     * @return List of EquipmentTypeDTO objects
     */
    @GetMapping
    public List<EquipmentTypeDTO> getAllTypes() {
        return equipmentTypeService.listEquipmentTypes();
    }

    /**
     * GET /api/equipment-types/{id}/attributes
     * <p>
     * Returns all unique attributes for a given equipment type by aggregating
     * attributes from all equipment of this type.
     *
     * @param id ID of the EquipmentType
     * @return List of EquipmentAttributeDTO objects
     */
    @GetMapping("/{id}/attributes")
    public List<EquipmentAttributeDTO> getAttributesForType(@PathVariable Long id) {
        return equipmentTypeService.getUniqueAttributes(id);
    }

    /**
     * GET /api/equipment-types/{id}/attributes-all
     * <p>
     * Returns all attributes defined in the fieldSchema of the equipment type.
     *
     * @param id ID of the EquipmentType
     * @return List of EquipmentTypeAttributeDTO objects
     */
    @GetMapping("/{id}/attributes-all")
    public List<EquipmentTypeAttributeDTO> getAllAttributesForType(@PathVariable Long id) {
        return equipmentTypeService.getAllAttributes(id);
    }

    /**
     * GET /api/equipment-types/{typeId}/equipment
     * <p>
     * Returns all equipment of a given type, optionally filtered by attribute name and value.
     *
     * @param typeId    ID of the EquipmentType
     * @param attrName  Optional attribute name to filter equipment
     * @param attrValue Optional attribute value to filter equipment
     * @return List of EquipmentWithReservationsDTO objects
     */
    @GetMapping("/{typeId}/equipment")
    public List<EquipmentWithReservationsDTO> getEquipmentByTypeAndAttribute(
            @PathVariable Long typeId,
            @RequestParam(required = false) String attrName,
            @RequestParam(required = false) String attrValue) {

        return equipmentTypeService.getEquipmentWithReservations(typeId, attrName, attrValue);
    }

    /**
     * POST /api/equipment-types
     * <p>
     * Creates a new equipment type.
     *
     * @param request Request object containing name, fieldSchema, and color
     * @return Created EquipmentTypeDTO object
     */
    @PostMapping
    public EquipmentTypeDTO createEquipmentType(OAuth2AuthenticationToken authentication,
                                                @RequestBody CreateEquipmentTypeRequest request) {
        User user = userService.resolveCurrentUser(authentication);
        userService.requireTrainer(user);

        return equipmentTypeService.createEquipmentType(request);
    }

    /**
     * Updates the equipment type record (name, color, schema) after validating uniqueness.
     */
    @PutMapping("/{id}")
    public EquipmentTypeDTO updateEquipmentType(@PathVariable Long id,
                                                @RequestBody EquipmentTypeUpdateRequest request,
                                                OAuth2AuthenticationToken authentication) {
        User user = userService.resolveCurrentUser(authentication);
        userService.requireTrainer(user);

        return equipmentTypeService.updateEquipmentType(id, request);
    }

    /**
     * DELETE /api/equipment-types/{id}
     * <p>
     * Deletes an equipment type by ID. Returns 204 if successful, 409 if
     * equipment exists for this type, or 404 if not found.
     *
     * @param id ID of the EquipmentType to delete
     * @return ResponseEntity with appropriate status code
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteEquipmentType(@PathVariable Long id,
                                                    @RequestParam(defaultValue = "false") boolean force,
                                                    @RequestParam(required = false) String confirm,
                                                    OAuth2AuthenticationToken authentication) {
        User user = userService.resolveCurrentUser(authentication);
        userService.requireTrainer(user);
        try {
            if (force) {
                if (confirm == null || !confirm.equalsIgnoreCase("confirm")) {
                    return ResponseEntity.badRequest().build();
                }
                equipmentTypeService.forceDeleteEquipmentType(id);
            } else {
                equipmentTypeService.deleteEquipmentType(id);
            }
            return ResponseEntity.noContent().build(); // 204
        } catch (IllegalStateException e) {
            return ResponseEntity.status(HttpStatus.CONFLICT).build(); // 409
        } catch (RuntimeException e) {
            return ResponseEntity.notFound().build(); // 404
        }
    }
}
