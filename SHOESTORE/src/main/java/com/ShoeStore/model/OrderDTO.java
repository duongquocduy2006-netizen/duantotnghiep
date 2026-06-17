package com.ShoeStore.model;

import java.util.Date;

public class OrderDTO {
    private String orderCode;
    private String customerName;
    private Date createdAt;
    private double finalAmount;
    private int status;
    private String paymentMethod;

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
}
