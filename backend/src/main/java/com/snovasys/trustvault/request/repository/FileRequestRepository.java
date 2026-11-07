package com.snovasys.trustvault.request.repository;

import com.snovasys.trustvault.request.entity.FileRequest;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.UUID;

public interface FileRequestRepository extends JpaRepository<FileRequest, UUID> {

    @Query("SELECT r FROM FileRequest r JOIN FETCH r.requester LEFT JOIN FETCH r.resolvedBy LEFT JOIN FETCH r.fulfilledDocument ORDER BY r.createdAt DESC")
    List<FileRequest> findAllWithUsers();

    @Query("SELECT r FROM FileRequest r JOIN FETCH r.requester LEFT JOIN FETCH r.resolvedBy LEFT JOIN FETCH r.fulfilledDocument WHERE r.requester.id = :requesterId ORDER BY r.createdAt DESC")
    List<FileRequest> findAllByRequesterId(UUID requesterId);
}
