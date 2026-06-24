<?php
/**
 * UFriends PHP SDK
 * Version: 1.0.0
 * 
 * Usage:
 * require 'ufriends-php-sdk.php';
 * $client = new UFriends('your-api-key');
 * 
 * // Fetch services
 * $services = $client->getServices('data');
 * 
 * // Purchase data (sandbox mode)
 * $result = $client->purchaseService([
 *     'serviceId' => 1,
 *     'recipient' => '08012345678',
 *     'amount' => 500
 * ], true);
 */

class UFriends {
    private $apiKey;
    private $baseUrl;

    public function __construct($apiKey, $baseUrl = 'https://ufriends.com.ng/api/v1') {
        if (empty($apiKey)) {
            throw new Exception("API Key is required");
        }
        $this->apiKey = $apiKey;
        $this->baseUrl = rtrim($baseUrl, '/');
    }

    /**
     * Perform HTTP Request
     */
    private function request($endpoint, $method = 'GET', $data = null, $test = false) {
        $url = $this->baseUrl . $endpoint;
        
        if ($test) {
            $url .= (strpos($url, '?') !== false) ? '&test=true' : '?test=true';
        }

        $ch = curl_init($url);
        
        $headers = [
            'Authorization: Bearer ' . $this->apiKey,
            'Content-Type: application/json',
            'Accept: application/json'
        ];

        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
        curl_setopt($ch, CURLOPT_CUSTOMREQUEST, strtoupper($method));

        if ($data && in_array(strtoupper($method), ['POST', 'PUT', 'PATCH'])) {
            curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
        }

        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $error = curl_error($ch);
        curl_close($ch);

        if ($error) {
            throw new Exception("cURL Error: " . $error);
        }

        $decoded = json_decode($response, true);
        
        if ($httpCode >= 400) {
            $msg = isset($decoded['message']) ? $decoded['message'] : 'API request failed';
            throw new Exception("HTTP Error {$httpCode}: {$msg}");
        }

        return $decoded;
    }

    public function getServices($type) {
        return $this->request("/services/{$type}", 'GET');
    }

    public function verifyService($params, $test = false) {
        return $this->request('/services/verify', 'POST', $params, $test);
    }

    public function purchaseService($params, $test = false) {
        return $this->request('/services/purchase', 'POST', $params, $test);
    }

    public function verifyBvn($params, $test = false) {
        return $this->request('/identity/bvn', 'POST', $params, $test);
    }

    public function verifyNin($params, $test = false) {
        return $this->request('/identity/nin', 'POST', $params, $test);
    }

    /**
     * Validate Webhook Signature
     */
    public static function verifyWebhookSignature($payload, $signature, $webhookSecret) {
        $hash = hash_hmac('sha512', $payload, $webhookSecret);
        return hash_equals($hash, $signature);
    }
}
