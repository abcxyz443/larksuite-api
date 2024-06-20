const axios = require('axios');
const config = require('../config/config')
module.exports = (function () {

    //lấy access_token
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
            const response = await axios.get(`${config.wooCommerceUrl}/wp-json/myplugin/v1/orders`, {
                params: { fields: "id, date, total, customer_name, status" }
            });
            return response.data;
        } catch (err) {
            console.error("Error getting list orders: ", err);
            throw new Error("Unable to get list orders");
        }
    }

    //Lấy ra order mới nhất
    async function get_order(){
        try{
            const response = await axios.get(`${config.wooCommerceUrl}/wp-json/myplugin/v1/latest-order`,{
                params: { fields: "id, date, total, customer_name, status" }

            });
            return response.data;
        }catch(err){
            console.error("Error getting  order: ", err);
        }
    }

    // Cập nhật trạng thái đơn hàng trong WooCommerce
	  async function updateOrderStatus(orderId, status) {
		try {
            console.log(1);
            console.log("Bắt đầu cập nhật trạng thái đơn hàng", orderId);
            const authHeader = createBasicAuthHeader(config.consumerKey, config.consumerSecret);

            const response = await axios.put(
                `${config.wooCommerceUrl}/wp-json/myplugin/v1/orders/${orderId}`,
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
      function createBasicAuthHeader(username, password) {
        const token = Buffer.from(`${username}:${password}`).toString('base64');
        return `Basic ${token}`;
    }
})();
