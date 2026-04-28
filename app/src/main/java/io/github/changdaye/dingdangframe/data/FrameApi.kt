package io.github.changdaye.dingdangframe.data

import kotlinx.serialization.Serializable
import kotlinx.serialization.json.Json
import java.io.BufferedReader
import java.net.HttpURLConnection
import java.net.URL

sealed interface FrameResult {
  data class Success(val imageUrl: String, val updatedAt: String) : FrameResult
  data class Error(val code: String, val message: String) : FrameResult
}

interface FrameApi {
  suspend fun fetchFrame(config: AppConfig): FrameResult
}

class HttpFrameApi(
  private val json: Json = Json { ignoreUnknownKeys = true },
) : FrameApi {
  override suspend fun fetchFrame(config: AppConfig): FrameResult {
    val connection = (URL(config.baseUrl.trimEnd('/') + "/frame").openConnection() as HttpURLConnection).apply {
      requestMethod = "POST"
      setRequestProperty("Content-Type", "application/json")
      doOutput = true
    }

    val payload = RequestBody(config.username, config.password)
    connection.outputStream.bufferedWriter().use { it.write(json.encodeToString(RequestBody.serializer(), payload)) }

    return connection.inputOrError().use { bodyText ->
      val body = json.decodeFromString(ResponseBody.serializer(), bodyText)
      if (body.ok && body.imageUrl != null && body.updatedAt != null) {
        FrameResult.Success(body.imageUrl, body.updatedAt)
      } else {
        FrameResult.Error(body.code ?: "INVALID_RESPONSE", body.message ?: "Unknown response")
      }
    }
  }

  private fun HttpURLConnection.inputOrError(): BufferedReader {
    val stream = if (responseCode in 200..299) inputStream else errorStream ?: inputStream
    return stream.bufferedReader()
  }

  @Serializable
  private data class RequestBody(val username: String, val password: String)

  @Serializable
  private data class ResponseBody(
    val ok: Boolean,
    val imageUrl: String? = null,
    val updatedAt: String? = null,
    val code: String? = null,
    val message: String? = null,
  )
}
