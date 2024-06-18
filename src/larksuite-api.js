const express = require('express');
const router = express.Router();
const axios = require('axios');

module.exports = (function () {
    // Lấy access_token
    async function get_access_token() {
        try {
            const response = await axios.post('https://open.larksuite.com/open-apis/auth/v3/app_access_token/internal', {
                app_id: "cli_a6e6b7d475b8902f",
                app_secret: "tupej3VZjXsZJUNdoMvprYZmuARFQtjU"
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
    async function get_list_order() {
        try {
            const response = await axios.get('http://demo.themimi.net/wp-json/myplugin/v1/orders', {
                params: { fields: "id, date, total, customer_name, status" }
            });
            return response.data;
        } catch (err) {
            console.error("Error getting list orders: ", err);
            throw new Error("Unable to get list orders");
        }
    }
	router.get('/get_list_order', async(req,res)=>{
		try {
            const response = await get_list_order();
            res.send(response.data);
        } catch (err) {
            console.error("Error getting list orders: ", err);
            throw new Error("Unable to get list orders");
        }
	})

    // Tạo bản ghi mới
    async function create_record(fields, access_token) {
        try {
            const response = await axios.post(
                "https://open.larksuite.com/open-apis/bitable/v1/apps/VY5Db3XasahyrLsbB1oljHYAg1e/tables/tblbin4RuHqK3lvH/records",
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

    router.post('/list_order', async (req, res) => {
        try {
            const list_order = await get_list_order();
            const access_token = await get_access_token();
    
            for (const order of list_order) {
                // const date = formatDate(order.date);
    
                const fields = {
                    "id": String(order.id),
                    "name": String(order.customer_name),
                    "total": String(order.total),
                    "status": String(order.status),
                    // "date": date,
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
      // Route để nhận webhook từ Lark
      router.put('/webhook', async (req, res) => {
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
      
      const consumerKey =  'ck_87fc1b79f909d4caa5cfaee29540d3c14fc054a4'
      const consumerSecret = 'cs_a80709ba8b1f53d32db0806c063507cd6408c869'
      function createBasicAuthHeader(username, password) {
        const token = Buffer.from(`${username}:${password}`).toString('base64');
        return `Basic ${token}`;
      }
	  // Cập nhật trạng thái đơn hàng trong WooCommerce
	  async function updateOrderStatus(orderId, status) {
		try {
            console.log(1);
            console.log("Bắt đầu cập nhật trạng thái đơn hàng", orderId);
            const authHeader = createBasicAuthHeader(consumerKey, consumerSecret);

            const response = await axios.put(
                `http://demo.themimi.net/wp-json/myplugin/v1/orders/${orderId}`,
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
