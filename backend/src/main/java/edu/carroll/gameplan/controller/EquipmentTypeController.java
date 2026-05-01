package edu.carroll.gameplan.controller;

import edu.carroll.gameplan.dto.request.CreateEquipmentTypeRequest;
import edu.carroll.gameplan.dto.request.EquipmentTypeUpdateRequest;
import edu.carroll.gameplan.dto.response.EquipmentAttributeDTO;
import edu.carroll.gameplan.dto.response.EquipmentTypeAttributeDTO;
import edu.carroll.gameplan.dto.response.EquipmentTypeDTO;
import edu.carroll.gameplan.dto.response.EquipmentWithReservationsDTO;
import edu.carroll.gameplan.model.User;
import edu.carroll.gameplan.service.EquipmentTypeService;
import edu.carroll.gameplan.service.UserService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.oauth2.client.authentication.OAuth2AuthenticationToken;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * Equipment type endpoints for browsing shared metadata and managing type
 * definitions used by trainers and admins.
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
     * Returns all equipment types for use in the UI.
     */
    @GetMapping
    public List<EquipmentTypeDTO> getAllTypes() {
        return equipmentTypeService.listEquipmentTypes();
    }

    /**
     * Returns the unique attributes currently observed for a type.
     */
    @GetMapping("/{id}/attributes")
    public List<EquipmentAttributeDTO> getAttributesForType(@PathVariable Long id) {
        return equipmentTypeService.getUniqueAttributes(id);
    }

    /**
     * Returns every attribute defined in the type schema, even if no equipment
     * instance is currently using it.
     */
    @GetMapping("/{id}/attributes-all")
    public List<EquipmentTypeAttributeDTO> getAllAttributesForType(@PathVariable Long id) {
        return equipmentTypeService.getAllAttributes(id);
    }

    /**
     * Returns equipment for a type, optionally filtered by an attribute name
     * and value pair.
     */
    @GetMapping("/{typeId}/equipment")
    public List<EquipmentWithReservationsDTO> getEquipmentByTypeAndAttribute(
            @PathVariable Long typeId,
            @RequestParam(required = false) String attrName,
            @RequestParam(required = false) String attrValue) {

        return equipmentTypeService.getAvailableEquipmentWithReservations(typeId, attrName, attrValue);
    }

    /**
     * Creates a new equipment type after verifying trainer access.
     */
    @PostMapping
    public EquipmentTypeDTO createEquipmentType(OAuth2AuthenticationToken authentication,
                                                @RequestBody CreateEquipmentTypeRequest request) {
        User user = userService.resolveCurrentUser(authentication);
        userService.requireTrainer(user);

        return equipmentTypeService.createEquipmentType(request);
    }

    /**
     * Updates the equipment type record after validating trainer access.
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
     * Deletes an equipment type and optionally force-removes dependent records.
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
