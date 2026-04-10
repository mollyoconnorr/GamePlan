package edu.carroll.gameplan.repository;

import edu.carroll.gameplan.model.Equipment;
import edu.carroll.gameplan.model.EquipmentStatus;
import edu.carroll.gameplan.model.EquipmentType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.Optional;

/**
 * Repository interface for managing {@link Equipment} entities.
 * <p>
 * Extends {@link JpaRepository} to provide standard CRUD operations,
 * along with custom query methods for filtering equipment by type and attributes.
 * </p>
 */
public interface EquipmentRepository extends JpaRepository<Equipment, Long> {

    /**
     * Finds all equipment belonging to a specific equipment type.
     *
     * @param typeId ID of the equipment type
     * @return list of equipment matching the given type
     */
    List<Equipment> findByEquipmentTypeId(Long typeId);

    /**
     * Finds equipment by type and optionally filters by attribute name and value.
     * <p>
     * This query supports flexible filtering:
     * <ul>
     *   <li>If {@code attrName} is null, all attribute names are included.</li>
     *   <li>If {@code attrValue} is null, all attribute values are included.</li>
     *   <li>If both are provided, only matching attribute name/value pairs are returned.</li>
     * </ul>
     * </p>
     *
     * <p><b>Example usage:</b></p>
     * <ul>
     *   <li>Find all equipment of a type → attrName = null, attrValue = null</li>
     *   <li>Filter by attribute name → attrName = "size", attrValue = null</li>
     *   <li>Filter by name and value → attrName = "size", attrValue = "M"</li>
     * </ul>
     *
     * @param typeId    ID of the equipment type
     * @param attrName  Optional attribute name to filter by
     * @param attrValue Optional attribute value to filter by
     * @return list of matching equipment
     */
    @Query("""
                SELECT DISTINCT e FROM Equipment e
                LEFT JOIN e.attributes a
                WHERE e.equipmentType.id = :typeId
                AND (:attrName IS NULL OR a.name = :attrName)
                AND (:attrValue IS NULL OR a.value = :attrValue)
                AND (:status IS NULL OR e.status = :status)
            """)
    List<Equipment> findByTypeAndAttributeAndStatus(Long typeId, String attrName, String attrValue, EquipmentStatus status);

    /**
     * Finds a piece of equipment by its name and type.
     * <p>
     * Useful for ensuring uniqueness within a specific equipment type.
     * </p>
     *
     * @param name Name of the equipment
     * @param type EquipmentType entity
     * @return Optional containing the equipment if found, otherwise empty
     */
    Optional<Equipment> findByNameAndEquipmentType(String name, EquipmentType type);

}