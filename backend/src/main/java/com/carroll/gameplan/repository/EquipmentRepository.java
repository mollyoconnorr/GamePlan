package com.carroll.gameplan.repository;

import com.carroll.gameplan.model.Equipment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface EquipmentRepository extends JpaRepository<Equipment, Long> {

    /** Find all equipment by type */
    List<Equipment> findByEquipmentTypeId(Long typeId);

    /** Find all equipment by type and optional attribute name/value */
    @Query("""
        SELECT DISTINCT e FROM Equipment e
        LEFT JOIN e.attributes a
        WHERE e.equipmentType.id = :typeId
        AND (:attrName IS NULL OR a.name = :attrName)
        AND (:attrValue IS NULL OR a.value = :attrValue)
    """)
    List<Equipment> findByTypeAndAttribute(@Param("typeId") Long typeId,
                                           @Param("attrName") String attrName,
                                           @Param("attrValue") String attrValue);
}