package com.ShoeStore.model;

import java.util.Date;

public class OrderDTO {
    private String orderCode;
    private String customerName;
    private Date createdAt;
    private double finalAmount;
    private int status;
    private String paymentMethod;
    private Integer paymentStatus;
    private String cancelReason;
    private String refundReason;
    private Date refundAt;
    private String refundBankBin;
    private String refundBankAccount;
    private String refundAccountName;

    public OrderDTO() {
    }

    public OrderDTO(String orderCode, String customerName, Date createdAt, double finalAmount, int status,
            String paymentMethod) {
        this.orderCode = orderCode;
        this.customerName = customerName;
        this.createdAt = createdAt;
        this.finalAmount = finalAmount;
        this.status = status;
        this.paymentMethod = paymentMethod;
    }

    public String getOrderCode() {
        return orderCode;
    }

    public void setOrderCode(String orderCode) {
        this.orderCode = orderCode;
    }

    public String getCustomerName() {
        return customerName;
    }

    public void setCustomerName(String customerName) {
        this.customerName = customerName;
    }

    public Date getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(Date createdAt) {
        this.createdAt = createdAt;
    }

    public double getFinalAmount() {
        return finalAmount;
    }

    public void setFinalAmount(double finalAmount) {
        this.finalAmount = finalAmount;
    }

    public int getStatus() {
        return status;
    }

    public void setStatus(int status) {
        this.status = status;
    }

    public String getPaymentMethod() {
        return paymentMethod;
    }

    public void setPaymentMethod(String paymentMethod) {
        this.paymentMethod = paymentMethod;
    }

    public Integer getPaymentStatus() {
        return paymentStatus;
    }

    public void setPaymentStatus(Integer paymentStatus) {
        this.paymentStatus = paymentStatus;
    }

    public String getCancelReason() {
        return cancelReason;
    }

    public void setCancelReason(String cancelReason) {
        this.cancelReason = cancelReason;
    }

    public String getRefundReason() {
        return refundReason;
    }

    public void setRefundReason(String refundReason) {
        this.refundReason = refundReason;
    }

    public Date getRefundAt() {
        return refundAt;
    }

    public void setRefundAt(Date refundAt) {
        this.refundAt = refundAt;
    }

    public String getRefundBankBin() {
        return refundBankBin;
    }

    public void setRefundBankBin(String refundBankBin) {
        this.refundBankBin = refundBankBin;
    }

    public String getRefundBankAccount() {
        return refundBankAccount;
    }

    public void setRefundBankAccount(String refundBankAccount) {
        this.refundBankAccount = refundBankAccount;
    }

    public String getRefundAccountName() {
        return refundAccountName;
    }

    public void setRefundAccountName(String refundAccountName) {
        this.refundAccountName = refundAccountName;
    }
}
