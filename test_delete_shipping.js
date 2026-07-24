async function test() {
    try {
        const detailRes = await fetch('http://localhost:8080/api/orders/ORD-1783928127');
        const detailData = await detailRes.json();
        console.log('Raw detail response:', detailData);
    } catch (err) {
        console.error('Error:', err.message);
    }
}

test();
