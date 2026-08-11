export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  stock: number;
  category: string;
  image_url: string;
  sku: string;
  created_at: string;
}

export type OrderStatus = 'pending' | 'paid' | 'preparing' | 'ready' | 'completed' | 'cancelled';

export interface Order {
  id: string;
  order_number: string;
  status: OrderStatus;
  total: number;
  payment_method: string;
  payment_status: string;
  customer_name: string;
  created_at: string;
}

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string | null;
  name: string;
  price: number;
  quantity: number;
  subtotal: number;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface CartItem {
  product_id: string;
  name: string;
  price: number;
  quantity: number;
  image_url: string;
}
