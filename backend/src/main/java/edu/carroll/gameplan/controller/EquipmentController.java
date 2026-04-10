package edu.carroll.gameplan.controller;

import edu.carroll.gameplan.dto.request.CreateEquipmentRequest;
import edu.carroll.gameplan.dto.request.EquipmentStatusUpdateRequest;
import edu.carroll.gameplan.dto.request.EquipmentUpdateRequest;
import edu.carroll.gameplan.dto.response.EquipmentDTO;
import edu.carroll.gameplan.dto.response.EquipmentStatusUpdateResponse;
import edu.carroll.gameplan.model.User;
import edu.carroll.gameplan.service.EquipmentService;
import edu.carroll.gameplan.service.UserService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.oauth2.client.authentication.OAuth2AuthenticationToken;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * REST controller for managing Equipment.
 * <p>
 * Provides endpoints for listing all equipment, creating new equipment,
 * and deleting equipment by ID.
 * </p>
 */
@RestController
@RequestMapping("/api/equipment")
public class EquipmentController {

    private final EquipmentService equipmentService;
    private final UserService userService;

    /**
     * Constructor for EquipmentController.
     *
     * @param equipmentService Service handling equipment business logic
     * @param userService      Service for resolving and authorizing users
     */
    public EquipmentController(EquipmentService equipmentService,
                               UserService userService) {
        this.equipmentService = equipmentService;
        this.userService = userService;
    }

    /**
     * GET /api/equipment
     * <p>
     * Returns all equipment as a list of EquipmentDTOs.
     * Includes attributes and type information.
     *
     * @return List of EquipmentDTO objects
     */
    @GetMapping
    public List<EquipmentDTO> getAllEquipment(OAuth2AuthenticationToken authentication) {
        User user = userService.resolveCurrentUser(authentication);
        userService.requireTrainer(user);

        return equipmentService.listAllEquipment();
    }

    /**
     * POST /api/equipment
     * <p>
     * Creates a new equipment entity with the specified name, type, and attributes.
     * Sets the default status to AVAILABLE.
     *
     * @param request CreateEquipmentRequest containing name, typeId, and attributes
     * @return The saved Equipment entity
     */
    @PostMapping
    public EquipmentDTO createEquipment(OAuth2AuthenticationToken authentication,
                                        @RequestBody CreateEquipmentRequest request) {
        User user = userService.resolveCurrentUser(authentication);
        userService.requireTrainer(user);

        return equipmentService.createEquipment(request);
    }

    /**
     * Returns a single {@link EquipmentDTO} for the given ID after validating trainer access.
     */
    @GetMapping("/{id}")
    public EquipmentDTO getEquipment(@PathVariable Long id,
                                     OAuth2AuthenticationToken authentication) {
        User user = userService.resolveCurrentUser(authentication);
        userService.requireTrainer(user);

        return equipmentService.getEquipment(id);
    }

    /**
     * Updates metadata (name, type, attributes) of an equipment instance.
     */
    @PutMapping("/{id}")
    public EquipmentDTO updateEquipment(@PathVariable Long id,
                                        @RequestBody EquipmentUpdateRequest request,
                                        OAuth2AuthenticationToken authentication) {
        User user = userService.resolveCurrentUser(authentication);
        userService.requireTrainer(user);

        return equipmentService.updateEquipment(id, request);
    }

    /**
     * Updates the persisted status (AVAILABLE, MAINTENANCE, etc.) of the equipment.
     */
    @PutMapping("/{id}/status")
    public EquipmentStatusUpdateResponse updateEquipmentStatus(@PathVariable Long id,
                                                               @RequestBody EquipmentStatusUpdateRequest request,
                                                               OAuth2AuthenticationToken authentication) {
        User user = userService.resolveCurrentUser(authentication);
        userService.requireTrainer(user);

        return equipmentService.updateEquipmentStatus(id, request, user);
    }

    /**
     * DELETE /api/equipment/{id}
     * <p>
     * Deletes an equipment entity by its ID.
     *
     * @param id ID of the Equipment to delete
     * @return ResponseEntity with 204 if deleted, 404 if not found
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteEquipment(@PathVariable Long id,
                                                OAuth2AuthenticationToken authentication) {
        User user = userService.resolveCurrentUser(authentication);
        userService.requireTrainer(user);
        if (!equipmentService.deleteEquipment(id, user)) {
            return ResponseEntity.notFound().build();
        }

        return ResponseEntity.noContent().build();
    }
}
