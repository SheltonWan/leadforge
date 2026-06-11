/**
 * AES-256-GCM 对称加密工具，用于存储第三方平台凭证。
 * 密钥来自环境变量 CREDENTIAL_ENCRYPTION_KEY（64 字符十六进制 = 32 字节）。
 */

import { createCipheriv, createDecipheriv, randomBytes } from 'crypto'

const ALGORITHM = 'aes-256-gcm'
const IV_BYTES = 12  // 96-bit IV recommended for GCM
const TAG_BYTES = 16

function getKey(): Buffer {
  const hex = process.env.CREDENTIAL_ENCRYPTION_KEY
  if (!hex || hex.length !== 64) {
    throw new Error(
      'CREDENTIAL_ENCRYPTION_KEY 未设置或长度不正确（需要 64 字符十六进制 = 32 字节）',
    )
  }
  return Buffer.from(hex, 'hex')
}

/**
 * 加密明文字符串。
 * 返回格式：`<iv_hex>:<tag_hex>:<ciphertext_hex>`
 */
export function encrypt(plaintext: string): string {
  const key = getKey()
  const iv = randomBytes(IV_BYTES)
  const cipher = createCipheriv(ALGORITHM, key, iv)
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return `${iv.toString('hex')}:${tag.toString('hex')}:${encrypted.toString('hex')}`
}

/**
 * 解密 encrypt() 返回的字符串。
 * 若认证标签验证失败（数据被篡改），抛出错误。
 */
export function decrypt(encoded: string): string {
  const parts = encoded.split(':')
  if (parts.length !== 3) throw new Error('凭证格式无效')
  const [ivHex, tagHex, ciphertextHex] = parts
  const key = getKey()
  const iv = Buffer.from(ivHex!, 'hex')
  const tag = Buffer.from(tagHex!, 'hex')
  const ciphertext = Buffer.from(ciphertextHex!, 'hex')
  const decipher = createDecipheriv(ALGORITHM, key, iv)
  decipher.setAuthTag(tag)
  return decipher.update(ciphertext).toString('utf8') + decipher.final('utf8')
}
