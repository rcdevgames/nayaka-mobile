package com.nayakacctv

import com.facebook.react.modules.network.OkHttpClientFactory
import okhttp3.OkHttpClient
import java.security.SecureRandom
import java.security.cert.X509Certificate
import javax.net.ssl.SSLContext
import javax.net.ssl.TrustManager
import javax.net.ssl.X509TrustManager

class UnsafeOkHttpClientFactory : OkHttpClientFactory {
  override fun createNewNetworkModuleClient(): OkHttpClient {
    val trustManager = object : X509TrustManager {
      override fun checkClientTrusted(chain: Array<out X509Certificate>, authType: String) = Unit
      override fun checkServerTrusted(chain: Array<out X509Certificate>, authType: String) = Unit
      override fun getAcceptedIssuers(): Array<X509Certificate> = emptyArray()
    }
    val sslContext = SSLContext.getInstance("TLS")
    sslContext.init(null, arrayOf<TrustManager>(trustManager), SecureRandom())

    return com.facebook.react.modules.network.OkHttpClientProvider
      .createClientBuilder()
      .sslSocketFactory(sslContext.socketFactory, trustManager)
      .hostnameVerifier { _, _ -> true }
      .build()
  }
}
