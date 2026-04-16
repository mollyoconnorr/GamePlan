package edu.carroll.gameplan;

import edu.carroll.gameplan.controller.EquipmentTypeController;
import edu.carroll.gameplan.dto.request.CreateEquipmentTypeRequest;
import edu.carroll.gameplan.dto.request.EquipmentTypeUpdateRequest;
import edu.carroll.gameplan.dto.response.EquipmentAttributeDTO;
import edu.carroll.gameplan.dto.response.EquipmentTypeAttributeDTO;
import edu.carroll.gameplan.dto.response.EquipmentTypeDTO;
import edu.carroll.gameplan.dto.response.EquipmentWithReservationsDTO;
import edu.carroll.gameplan.model.User;
import edu.carroll.gameplan.model.UserRole;
import edu.carroll.gameplan.service.EquipmentTypeService;
import edu.carroll.gameplan.service.UserService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.ResponseEntity;
import org.springframework.security.oauth2.client.authentication.OAuth2AuthenticationToken;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class EquipmentTypeControllerTest {

    private EquipmentTypeService equipmentTypeService;
    private UserService userService;
    private EquipmentTypeController controller;
    private OAuth2AuthenticationToken authentication;
    private User trainer;

    @BeforeEach
    void setUp() {
        equipmentTypeService = mock(EquipmentTypeService.class);
        userService = mock(UserService.class);
        controller = new EquipmentTypeController(equipmentTypeService, userService);
        authentication = mock(OAuth2AuthenticationToken.class);

        trainer = new User();
        trainer.setId(88L);
        trainer.setRole(UserRole.AT);
        when(userService.resolveCurrentUser(authentication)).thenReturn(trainer);
    }

    @Test
    void getAllTypesDelegatesWithoutAuthGuard() {
        List<EquipmentTypeDTO> expected = List.of(new EquipmentTypeDTO(1L, "Bike", false, null, null));
        when(equipmentTypeService.listEquipmentTypes()).thenReturn(expected);

        List<EquipmentTypeDTO> actual = controller.getAllTypes();

        assertEquals(expected, actual);
        verify(equipmentTypeService).listEquipmentTypes();
    }

    @Test
    void getAttributesForTypeDelegates() {
        List<EquipmentAttributeDTO> expected = List.of(new EquipmentAttributeDTO("Size", "M"));
        when(equipmentTypeService.getUniqueAttributes(2L)).thenReturn(expected);

        List<EquipmentAttributeDTO> actual = controller.getAttributesForType(2L);

        assertEquals(1, actual.size());
        assertEquals("Size", actual.get(0).getName());
        verify(equipmentTypeService).getUniqueAttributes(2L);
    }

    @Test
    void getAllAttributesForTypeDelegates() {
        List<EquipmentTypeAttributeDTO> expected = List.of(new EquipmentTypeAttributeDTO("Color", List.of("Red", "Blue")));
        when(equipmentTypeService.getAllAttributes(3L)).thenReturn(expected);

        List<EquipmentTypeAttributeDTO> actual = controller.getAllAttributesForType(3L);

        assertEquals(expected, actual);
        verify(equipmentTypeService).getAllAttributes(3L);
    }

    @Test
    void getEquipmentByTypeAndAttributeDelegates() {
        List<EquipmentWithReservationsDTO> expected = List.of(
                new EquipmentWithReservationsDTO(10L, "Bike 1", List.of(), List.of())
        );
        when(equipmentTypeService.getAvailableEquipmentWithReservations(5L, "Size", "M")).thenReturn(expected);

        List<EquipmentWithReservationsDTO> actual = controller.getEquipmentByTypeAndAttribute(5L, "Size", "M");

        assertEquals(expected, actual);
        verify(equipmentTypeService).getAvailableEquipmentWithReservations(5L, "Size", "M");
    }

    @Test
    void createEquipmentTypeRequiresTrainerAndDelegates() {
        CreateEquipmentTypeRequest request = new CreateEquipmentTypeRequest();
        request.setName("Rowers");
        EquipmentTypeDTO expected = new EquipmentTypeDTO(4L, "Rowers", false, "#111111", null);
        when(equipmentTypeService.createEquipmentType(request)).thenReturn(expected);

        EquipmentTypeDTO actual = controller.createEquipmentType(authentication, request);

        assertEquals(expected, actual);
        verify(userService).resolveCurrentUser(authentication);
        verify(userService).requireTrainer(trainer);
        verify(equipmentTypeService).createEquipmentType(request);
    }

    @Test
    void updateEquipmentTypeRequiresTrainerAndDelegates() {
        EquipmentTypeUpdateRequest request = new EquipmentTypeUpdateRequest();
        request.setName("Updated");
        EquipmentTypeDTO expected = new EquipmentTypeDTO(9L, "Updated", true, "#222222", "{}");
        when(equipmentTypeService.updateEquipmentType(9L, request)).thenReturn(expected);

        EquipmentTypeDTO actual = controller.updateEquipmentType(9L, request, authentication);

        assertEquals(expected, actual);
        verify(userService).resolveCurrentUser(authentication);
        verify(userService).requireTrainer(trainer);
        verify(equipmentTypeService).updateEquipmentType(9L, request);
    }

    @Test
    void deleteEquipmentTypeForceRequiresConfirm() {
        ResponseEntity<Void> response = controller.deleteEquipmentType(11L, true, null, authentication);

        assertEquals(HttpStatusCode.valueOf(400), response.getStatusCode());
        verify(userService).resolveCurrentUser(authentication);
        verify(userService).requireTrainer(trainer);
        verify(equipmentTypeService, never()).forceDeleteEquipmentType(11L);
    }

    @Test
    void deleteEquipmentTypeForceWithConfirmDeletes() {
        ResponseEntity<Void> response = controller.deleteEquipmentType(12L, true, "confirm", authentication);

        assertEquals(HttpStatusCode.valueOf(204), response.getStatusCode());
        verify(userService).resolveCurrentUser(authentication);
        verify(userService).requireTrainer(trainer);
        verify(equipmentTypeService).forceDeleteEquipmentType(12L);
    }

    @Test
    void deleteEquipmentTypeReturnsConflictForIllegalState() {
        org.mockito.Mockito.doThrow(new IllegalStateException("linked equipment"))
                .when(equipmentTypeService).deleteEquipmentType(13L);

        ResponseEntity<Void> response = controller.deleteEquipmentType(13L, false, null, authentication);

        assertEquals(HttpStatusCode.valueOf(409), response.getStatusCode());
        verify(userService).resolveCurrentUser(authentication);
        verify(userService).requireTrainer(trainer);
        verify(equipmentTypeService).deleteEquipmentType(13L);
    }

    @Test
    void deleteEquipmentTypeReturnsNotFoundForRuntimeException() {
        org.mockito.Mockito.doThrow(new RuntimeException("missing"))
                .when(equipmentTypeService).deleteEquipmentType(14L);

        ResponseEntity<Void> response = controller.deleteEquipmentType(14L, false, null, authentication);

        assertEquals(HttpStatusCode.valueOf(404), response.getStatusCode());
        verify(userService).resolveCurrentUser(authentication);
        verify(userService).requireTrainer(trainer);
        verify(equipmentTypeService).deleteEquipmentType(14L);
    }
}
