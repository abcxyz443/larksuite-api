const express = require('express');
const router = express.Router();
const axios = require('axios');
const config = require('./config/config')
module.exports = (function () {
    function createBasicAuthHeader(username, password) {
        const token = Buffer.from(`${username}:${password}`).toString('base64');
        return `Basic ${token}`;
    }
    // Hàm tải ảnh từ URL
    async function fetchImage(url) {
        const response = await fetch(url);
        const buffer = await response.buffer();
        return buffer;
    }
    // Lấy access_token
    async function get_access_token() {
        try {
            const response = await axios.post('https://open.larksuite.com/open-apis/auth/v3/app_access_token/internal', {
                app_id: config.app_id,
                app_secret: config.app_secret
            }, {
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            console.log("Access token retrieved:", response.data.app_access_token);
            return response.data.app_access_token;
        } catch (err) {
            console.error("Error getting access token: ", err);
            throw new Error("Unable to get access token");
        }
    }

    // Lấy danh sách order
    async function get_list_product() {
        try {
            const response = await axios.get(`http://localhost/wordpress/wp-json/myplugin/v1/products`, {
                params: { fields: "id, name, price, regular_price, sale_price, date_created, stock_status, stock_quantity, categories" }
            });
            const data = response.data;
            console.log(data);
            return data;
        } catch (err) {
            console.error("Error getting list orders: ", err);
            throw new Error("Unable to get list orders");
        }
    }
	router.get('/list_product', async(req,res)=>{
		try {
            const response = await get_list_product();
            console.log(response);
            res.send(response);
        } catch (err) {
            console.error("Error getting list orders: ", err);
            throw new Error("Unable to get list orders");
        }
	})
    
    // Tạo bản ghi mới
    // Hàm tạo bản ghi trong Larkbase
    async function create_record(fields, access_token) {
        try {
            const response = await axios.post(
                "https://open.larksuite.com/open-apis/bitable/v1/apps/VY5Db3XasahyrLsbB1oljHYAg1e/tables/tblJXEMlTMSiPRSu/records",
                { fields: fields },
                {
                    headers: {
                        'Authorization': `Bearer ${access_token}`,
                        'Content-Type': 'application/json'
                    }
                }
            );
            console.log(response.data);
        } catch (err) {
            console.error("Error creating record:", err.response ? err.response.data : err.message);
        }
    }
    // Chuyển đổi định dạng ngày
    function formatDate(dateString) {
        const date = new Date(dateString);
		const year = date.getFullYear();
		const month = String(date.getMonth() + 1).padStart(2, '0');
		const day = String(date.getDate()).padStart(2, '0');
		const hours = String(date.getHours()).padStart(2, '0');
		const minutes = String(date.getMinutes()).padStart(2, '0');

		// Dạng YYYY/MM/DD HH:MM
		const formattedDate = `${year}/${month}/${day} ${hours}:${minutes}`;

		return formattedDate;
    }
    // Hàm tải ảnh lên Larkbase
    async function upload_image_to_larkbase(image_url, access_token) {
        const image_buffer = await fetchImage(image_url);

        // Lấy tên file từ URL
        const filename = path.basename(image_url);

        const formData = new FormData();
        formData.append('file', image_buffer, {
            filename: filename, // Sử dụng tên file từ URL
            contentType: 'image/jpeg', // Cần tùy chỉnh nếu không phải JPEG
        });

        const response = await axios.post(
            'https://open.larksuite.com/open-apis/drive/v1/files/upload_all',
            formData,
            {
                headers: {
                    'Authorization': `Bearer ${access_token}`,
                    ...formData.getHeaders()
                }
            }
        );

        return response.data.data.fileToken;
    }

        // Định nghĩa route cho endpoint /list_product
    router.post('/list_product', async (req, res) => {
        try {
            const list_product = await get_list_product();
            const access_token = await get_access_token();

            for (const product of list_product) {
                const image_token = await upload_image_to_larkbase(product.image, access_token);

                const fields = {
                    'id': String(product.id),
                    'name': String(product.name),
                    'price': String(product.price),
                    'regular_price': String(product.regular_price),
                    'sale_price': String(product.sale_price),
                    'stock_status': String(product.stock_status),
                    'stock_quantity': String(product.stock_quantity),
                    'category': String(product.categories),
                    'img': [{ "file_token": image_token }] // Truyền file token của ảnh
                };

                console.log("Data to be sent to Lark Suite:", fields);

                await create_record(fields, access_token);
            }
            res.send("DONE!");
        } catch (err) {
            console.error("Error:", err);
            res.status(500).send("Error: " + err.message);
        }
    });

    // api webhook từ lark
    router.post('/order_woocommerce', async(req, res)=>{
        try{
            const {id, name, total, status , date} = req.body;
            console.log(req.body);
            const fields = {id,name,total,status,date};
            console.log("Received webhook: "+JSON.stringify(fields));
            await create_order_webhook(fields);
            res.send("DONE!");
        }catch(err){
            res.send("web hook : "+ err.message);
        }
    })
    async function create_order_webhook(fields){
        try{
            const authHeader = createBasicAuthHeader (config.consumerKey, config.consumerSecret);
            const response = await axios.post(
                `http://localhost/wordpress/wp-json/myplugin/v1/order`,
                fields
                ,{
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': authHeader
                    }
                }
            )
            console.log(response.data);
        }catch(err){
            console.error("Error create order webhook: " + err.message);
        }
    }
      // Route để nhận webhook thay đổi order từ Lark
      router.put('/update_order', async (req, res)=> {
        try {
          const { id, status } = req.body;
          console.log(`Received webhook with order ID: ${id} and status: ${status}`);
          await updateOrderStatus(id, status); // Gọi hàm updateOrderStatus với status được gửi dưới dạng object
          res.status(200).send('Webhook received');
        } catch (err) {
          console.error("Error handling Lark webhook:", err);
          res.status(500).send("Error: " + err.message);
        }
      });

      
	  // Cập nhật trạng thái đơn hàng trong WooCommerce
	  async function updateOrderStatus(orderId, status) {
		try {
            console.log(1);
            console.log("Bắt đầu cập nhật trạng thái đơn hàng", orderId);
            const authHeader = createBasicAuthHeader(config.consumerKey, config.consumerSecret);

            const response = await axios.put(
                `http://localhost/wordpress/wp-json/myplugin/v1/orders/${orderId}`,
                { status: status },
                {
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': authHeader
                    }
                }
             );
            console.log(2);
            console.log(response.data);
            console.log(`Order ${orderId} status updated to ${status} in WooCommerce`);
		} catch (err) {
		  console.error("Error updating order status in WooCommerce:", err.response ? err.response.data : err.message);
		}
	  }
    return router; 
})();
