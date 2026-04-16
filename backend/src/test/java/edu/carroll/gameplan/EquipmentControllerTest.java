package edu.carroll.gameplan;

import edu.carroll.gameplan.controller.EquipmentController;
import edu.carroll.gameplan.dto.request.CreateEquipmentRequest;
import edu.carroll.gameplan.dto.request.EquipmentStatusUpdateRequest;
import edu.carroll.gameplan.dto.request.EquipmentUpdateRequest;
import edu.carroll.gameplan.dto.response.EquipmentDTO;
import edu.carroll.gameplan.dto.response.EquipmentStatusUpdateResponse;
import edu.carroll.gameplan.model.User;
import edu.carroll.gameplan.model.UserRole;
import edu.carroll.gameplan.service.EquipmentService;
import edu.carroll.gameplan.service.UserService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.ResponseEntity;
import org.springframework.security.oauth2.client.authentication.OAuth2AuthenticationToken;

import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class EquipmentControllerTest {

    private EquipmentService equipmentService;
    private UserService userService;
    private EquipmentController controller;
    private OAuth2AuthenticationToken authentication;
    private User trainer;

    @BeforeEach
    void setUp() {
        equipmentService = mock(EquipmentService.class);
        userService = mock(UserService.class);
        controller = new EquipmentController(equipmentService, userService);
        authentication = mock(OAuth2AuthenticationToken.class);

        trainer = new User();
        trainer.setId(12L);
        trainer.setRole(UserRole.AT);
        when(userService.resolveCurrentUser(authentication)).thenReturn(trainer);
    }

    @Test
    void getAllEquipmentRequiresTrainerAndDelegates() {
        EquipmentDTO dto = buildEquipmentDto(1L, "Rack 1");
        when(equipmentService.listAllEquipment()).thenReturn(List.of(dto));

        List<EquipmentDTO> response = controller.getAllEquipment(authentication);

        assertEquals(1, response.size());
        assertEquals("Rack 1", response.get(0).getName());
        verify(userService).resolveCurrentUser(authentication);
        verify(userService).requireTrainer(trainer);
        verify(equipmentService).listAllEquipment();
    }

    @Test
    void createEquipmentRequiresTrainerAndDelegates() {
        CreateEquipmentRequest request = new CreateEquipmentRequest();
        request.setName("Bar 1");
        request.setEquipmentTypeId(3L);
        request.setAttributes(Map.of("Weight", "45"));
        EquipmentDTO dto = buildEquipmentDto(2L, "Bar 1");
        when(equipmentService.createEquipment(request)).thenReturn(dto);

        EquipmentDTO response = controller.createEquipment(authentication, request);

        assertEquals(2L, response.getId());
        verify(userService).resolveCurrentUser(authentication);
        verify(userService).requireTrainer(trainer);
        verify(equipmentService).createEquipment(request);
    }

    @Test
    void getEquipmentRequiresTrainerAndDelegates() {
        EquipmentDTO dto = buildEquipmentDto(7L, "Bike");
        when(equipmentService.getEquipment(7L)).thenReturn(dto);

        EquipmentDTO response = controller.getEquipment(7L, authentication);

        assertEquals("Bike", response.getName());
        verify(userService).resolveCurrentUser(authentication);
        verify(userService).requireTrainer(trainer);
        verify(equipmentService).getEquipment(7L);
    }

    @Test
    void updateEquipmentRequiresTrainerAndDelegates() {
        EquipmentUpdateRequest request = new EquipmentUpdateRequest();
        request.setName("Updated");
        EquipmentDTO dto = buildEquipmentDto(7L, "Updated");
        when(equipmentService.updateEquipment(7L, request)).thenReturn(dto);

        EquipmentDTO response = controller.updateEquipment(7L, request, authentication);

        assertEquals("Updated", response.getName());
        verify(userService).resolveCurrentUser(authentication);
        verify(userService).requireTrainer(trainer);
        verify(equipmentService).updateEquipment(7L, request);
    }

    @Test
    void updateEquipmentStatusRequiresTrainerAndDelegates() {
        EquipmentStatusUpdateRequest request = new EquipmentStatusUpdateRequest();
        request.setStatus("MAINTENANCE");
        EquipmentStatusUpdateResponse expected = new EquipmentStatusUpdateResponse(buildEquipmentDto(4L, "Rower"), 2);
        when(equipmentService.updateEquipmentStatus(4L, request, trainer)).thenReturn(expected);

        EquipmentStatusUpdateResponse response = controller.updateEquipmentStatus(4L, request, authentication);

        assertEquals(2, response.canceledReservations());
        assertEquals(4L, response.equipment().getId());
        verify(userService).resolveCurrentUser(authentication);
        verify(userService).requireTrainer(trainer);
        verify(equipmentService).updateEquipmentStatus(4L, request, trainer);
    }

    @Test
    void deleteEquipmentReturnsNotFoundWhenServiceReturnsFalse() {
        when(equipmentService.deleteEquipment(20L, trainer)).thenReturn(false);

        ResponseEntity<Void> response = controller.deleteEquipment(20L, authentication);

        assertEquals(HttpStatusCode.valueOf(404), response.getStatusCode());
        verify(userService).resolveCurrentUser(authentication);
        verify(userService).requireTrainer(trainer);
        verify(equipmentService).deleteEquipment(20L, trainer);
    }

    @Test
    void deleteEquipmentReturnsNoContentWhenServiceDeletes() {
        when(equipmentService.deleteEquipment(21L, trainer)).thenReturn(true);

        ResponseEntity<Void> response = controller.deleteEquipment(21L, authentication);

        assertEquals(HttpStatusCode.valueOf(204), response.getStatusCode());
        verify(userService).resolveCurrentUser(authentication);
        verify(userService).requireTrainer(trainer);
        verify(equipmentService).deleteEquipment(21L, trainer);
    }

    private EquipmentDTO buildEquipmentDto(Long id, String name) {
        EquipmentDTO dto = new EquipmentDTO();
        dto.setId(id);
        dto.setName(name);
        dto.setStatus("AVAILABLE");
        dto.setTypeId(1L);
        dto.setTypeName("Default");
        return dto;
    }
}
