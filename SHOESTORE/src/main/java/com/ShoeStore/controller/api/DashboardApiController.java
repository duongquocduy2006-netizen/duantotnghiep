package com.ShoeStore.controller.api;

import com.ShoeStore.service.DashboardService;
import com.ShoeStore.model.Activity;
import com.ShoeStore.model.RevenueItem;
import com.ShoeStore.model.TopProduct;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/admin/dashboard")
public class DashboardApiController {

    @Autowired
    private DashboardService dashboardService;

    @GetMapping
    public ResponseEntity<?> getDashboardStats(
            @RequestParam(required = false) String startDate,
            @RequestParam(required = false) String endDate) {
        
        if (startDate != null && startDate.isEmpty()) startDate = null;
        if (endDate != null && endDate.isEmpty()) endDate = null;

        Map<String, Object> data = new HashMap<>();
        
        // 1. Stats cards
        List<Map<String, Object>> stats = new ArrayList<>();
        
        Map<String, Object> rev = new HashMap<>();
        rev.put("label", "Doanh thu");
        rev.put("value", formatCurrency(dashboardService.getTotalRevenue(startDate, endDate)));
        rev.put("trend", "+12.5%");
        rev.put("type", "up");
        rev.put("icon", "bi-currency-dollar");
        stats.add(rev);
        
        Map<String, Object> ord = new HashMap<>();
        ord.put("label", "Đơn hàng");
        ord.put("value", dashboardService.getNewOrdersCount(startDate, endDate) + " đơn");
        ord.put("trend", "+2.4%");
        ord.put("type", "up");
        ord.put("icon", "bi-bag-check");
        ord.put("color", "var(--accent-cyan)");
        stats.add(ord);
        
        Map<String, Object> stock = new HashMap<>();
        stock.put("label", "Cần nhập kho");
        stock.put("value", dashboardService.getLowStockCount() + " SP");
        stock.put("trend", "+8.1%");
        stock.put("type", "up");
        stock.put("icon", "bi-box-seam");
        stock.put("color", "var(--accent-red)");
        stats.add(stock);
        
        Map<String, Object> cust = new HashMap<>();
        cust.put("label", "Khách hàng mới");
        cust.put("value", "+" + dashboardService.getNewCustomersCount(startDate, endDate));
        cust.put("trend", "+14%");
        cust.put("type", "up");
        cust.put("icon", "bi-person-plus");
        stats.add(cust);
        
        data.put("stats", stats);
        
        // 2. Monthly Stats
        data.put("monthlyStats", dashboardService.getMonthlyStats(startDate, endDate));
        
        // 3. Recent Activities
        data.put("activities", dashboardService.getRecentActivities());
        
        // 4. Top Products
        data.put("topProducts", dashboardService.getTopProducts(startDate, endDate));
        
        // 5. Donut & Bar Charts
        data.put("categorySales", dashboardService.getCategorySales(startDate, endDate));
        data.put("orderStatusStats", dashboardService.getOrderStatusDistribution(startDate, endDate));
        data.put("categoryBestSellers", dashboardService.getCategoryBestSellers(startDate, endDate));
        data.put("brandBestSellers", dashboardService.getBrandBestSellers(startDate, endDate));

        return ResponseEntity.ok(data);
    }
    
    private String formatCurrency(Double amount) {
        if (amount == null) return "0 ₫";
        java.text.DecimalFormat formatter = new java.text.DecimalFormat("###,###,###");
        return formatter.format(amount) + " ₫";
    }
}
