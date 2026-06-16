import axios from 'axios';

async function test() {
    try {
        const response = await axios.get('http://localhost:8080/api/home');
        console.log('Success:', response.data.success);
        if (response.data.latestProducts && response.data.latestProducts.length > 0) {
            console.log('First Product Keys:', Object.keys(response.data.latestProducts[0]));
            console.log('First Product Image URL:', response.data.latestProducts[0].image_url || response.data.latestProducts[0].imageUrl);
        }
    } catch (err) {
        console.error('Error:', err.message);
    }
}

test();
