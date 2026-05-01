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
 * Trainer/admin equipment endpoints for listing, creating, updating, and
 * deleting equipment records.
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
     * Returns all equipment visible to trainers and admins.
     */
    @GetMapping
    public List<EquipmentDTO> getAllEquipment(OAuth2AuthenticationToken authentication) {
        User user = userService.resolveCurrentUser(authentication);
        userService.requireTrainer(user);

        return equipmentService.listAllEquipment();
    }

    /**
     * Creates a new equipment record with the supplied metadata and
     * attributes.
     */
    @PostMapping
    public EquipmentDTO createEquipment(OAuth2AuthenticationToken authentication,
                                        @RequestBody CreateEquipmentRequest request) {
        User user = userService.resolveCurrentUser(authentication);
        userService.requireTrainer(user);

        return equipmentService.createEquipment(request);
    }

    /**
     * Returns a single equipment record after validating trainer access.
     */
    @GetMapping("/{id}")
    public EquipmentDTO getEquipment(@PathVariable Long id,
                                     OAuth2AuthenticationToken authentication) {
        User user = userService.resolveCurrentUser(authentication);
        userService.requireTrainer(user);

        return equipmentService.getEquipment(id);
    }

    /**
     * Updates equipment metadata such as name, type, and attributes.
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
     * Updates the persisted status of an equipment item.
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
     * Deletes an equipment item and cancels any active reservations tied to it.
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
