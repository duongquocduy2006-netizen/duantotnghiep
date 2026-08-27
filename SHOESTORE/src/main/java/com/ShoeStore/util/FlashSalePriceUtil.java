package com.ShoeStore.util;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

public class FlashSalePriceUtil {

    public static class SplitResult {
        public List<Map<String, Object>> items;
        public double totalPrice;
    }

    private static Object getValue(Map<String, Object> map, String key) {
        if (map == null) return null;
        if (map.containsKey(key)) return map.get(key);
        for (Map.Entry<String, Object> entry : map.entrySet()) {
            if (entry.getKey().equalsIgnoreCase(key)) {
                return entry.getValue();
            }
        }
        return null;
    }

    public static SplitResult processAndSplitItem(Map<String, Object> originalItem) {
        SplitResult result = new SplitResult();
        result.items = new ArrayList<>();
        result.totalPrice = 0.0;

        Object origPriceObj = getValue(originalItem, "original_price");
        if (origPriceObj == null) origPriceObj = getValue(originalItem, "price");
        double origPrice = origPriceObj != null ? ((Number) origPriceObj).doubleValue() : 0.0;
            
        Object qtyObj = getValue(originalItem, "quantity");
        int buyQty = qtyObj != null ? ((Number) qtyObj).intValue() : 1;

        Object salePriceVal = getValue(originalItem, "sale_price");
        Double salePriceObj = salePriceVal != null ? ((Number) salePriceVal).doubleValue() : null;

        Object qLimitVal = getValue(originalItem, "quantity_limit");
        Integer qLimitObj = qLimitVal != null ? ((Number) qLimitVal).intValue() : null;

        Object soldQtyVal = getValue(originalItem, "sold_quantity");
        Integer soldQtyObj = soldQtyVal != null ? ((Number) soldQtyVal).intValue() : 0;

        Object fspIdVal = getValue(originalItem, "fsp_id");
        Long fspId = fspIdVal != null ? ((Number) fspIdVal).longValue() : null;

        if (salePriceObj != null && salePriceObj > 0 && salePriceObj < origPrice) {
            int qLimit = qLimitObj != null ? qLimitObj : 0;
            int soldQty = soldQtyObj != null ? soldQtyObj : 0;

            int remaining = (qLimit == 0) ? 999999 : Math.max(0, qLimit - soldQty);
            int flashSaleQty = Math.min(buyQty, remaining);
            int normalQty = buyQty - flashSaleQty;

            Object rawId = getValue(originalItem, "id");
            String idStr = rawId != null ? String.valueOf(rawId) : "-1";

            if (flashSaleQty > 0) {
                Map<String, Object> fsItem = new HashMap<>(originalItem);
                fsItem.put("id", idStr + "_fs");
                fsItem.put("cartItemId", rawId);
                fsItem.put("quantity", flashSaleQty);
                fsItem.put("price", salePriceObj);
                fsItem.put("is_flash_sale", true);
                fsItem.put("flashSaleQtyUsed", flashSaleQty);
                fsItem.put("fspId", fspId);
                result.items.add(fsItem);
                result.totalPrice += flashSaleQty * salePriceObj;
            }

            if (normalQty > 0) {
                Map<String, Object> normalItem = new HashMap<>(originalItem);
                normalItem.put("id", idStr + "_normal");
                normalItem.put("cartItemId", rawId);
                normalItem.put("quantity", normalQty);
                normalItem.put("price", origPrice);
                normalItem.put("is_flash_sale", false);
                normalItem.put("flashSaleQtyUsed", 0);
                result.items.add(normalItem);
                result.totalPrice += normalQty * origPrice;
            }

            if (flashSaleQty <= 0 && normalQty <= 0) {
                Map<String, Object> normalItem = new HashMap<>(originalItem);
                normalItem.put("id", idStr);
                normalItem.put("cartItemId", rawId);
                normalItem.put("quantity", buyQty);
                normalItem.put("price", origPrice);
                normalItem.put("is_flash_sale", false);
                normalItem.put("flashSaleQtyUsed", 0);
                result.items.add(normalItem);
                result.totalPrice += buyQty * origPrice;
            }
        } else {
            Map<String, Object> normalItem = new HashMap<>(originalItem);
            normalItem.put("quantity", buyQty);
            normalItem.put("price", origPrice);
            normalItem.put("is_flash_sale", false);
            normalItem.put("flashSaleQtyUsed", 0);
            result.items.add(normalItem);
            result.totalPrice += buyQty * origPrice;
        }

        return result;
    }

    public static List<Map<String, Object>> processAndSplitList(List<Map<String, Object>> rawList) {
        List<Map<String, Object>> processedList = new ArrayList<>();
        if (rawList == null) return processedList;
        for (Map<String, Object> rawItem : rawList) {
            SplitResult sr = processAndSplitItem(rawItem);
            processedList.addAll(sr.items);
        }
        return processedList;
    }
}
