import { expect, test, type Page } from '@playwright/test'

// Recorre en orden los criterios de entrega: registrar, localizar, actualizar, ver en indicadores y exportar.
test.describe.configure({ mode: 'serial' })

const NAME = `Aceptacion ${Date.now()}`

async function login(page: Page, email: string) {
  await page.goto('/login')
  await page.getByLabel('Correo').fill(email)
  await page.getByLabel('Contrasena').fill('Craisa2026!')
  await page.getByRole('button', { name: 'Ingresar' }).click()
  await expect(page.getByRole('heading', { name: /^Buen(os|as) / })).toBeVisible()
}

async function kpi(page: Page, label: string) {
  const res = await page.request.get('/api/dashboard')
  const d = (await res.json()) as { kpis: Record<string, number>; byStatus: { key: string; count: number }[] }
  return label === 'total' ? (d.kpis.total ?? 0) : (d.byStatus.find((s) => s.key === label)?.count ?? 0)
}

async function csvRows(page: Page, query: string) {
  const res = await page.request.get(`/api/leads/export.csv?${query}`)
  expect(res.status()).toBe(200)
  return (await res.text()).replace(/^﻿/, '').trim().split('\r\n').slice(1)
}

test('criterios de entrega de punta a punta', async ({ page, browser }) => {
  await login(page, 'admin@craisa.test')
  const totalBefore = await kpi(page, 'total')
  const contactedBefore = await kpi(page, 'CONTACTADO')

  // 1. Registrar una consulta
  await page.getByRole('link', { name: 'Nuevo lead' }).first().click()
  await page.getByLabel('Nombre').fill(NAME)
  await page.getByRole('textbox', { name: 'Correo' }).fill('aceptacion@ejemplo.cr')
  await page.getByText('Sitio web', { exact: true }).click()
  await page.getByLabel('Linea de negocio').selectOption({ label: 'Carga' })
  await page.getByLabel('Descripcion de la consulta').fill('Cotizacion de montacargas electrico')
  await page.getByLabel('Responsable').selectOption({ label: 'Laura Jimenez' })
  await page.getByRole('button', { name: 'Registrar lead' }).click()
  await expect(page.getByRole('heading', { name: NAME })).toBeVisible()
  const code = page.url().split('/').pop() ?? ''
  expect(code).toMatch(/^LEAD-\d{4}-\d{4}$/)

  // 2. Localizarla con el buscador global
  await page.getByRole('searchbox', { name: 'Buscar leads' }).first().fill(NAME)
  await page.keyboard.press('Enter')
  await expect(page.getByRole('link', { name: NAME })).toBeVisible()
  await page.getByRole('link', { name: NAME }).click()

  // 3. Actualizar su estado con nota de gestion
  await page.getByRole('button', { name: 'Actualizar estado' }).click()
  const dialog = page.getByRole('dialog', { name: 'Actualizar estado' })
  await dialog.getByText('Contactado', { exact: true }).click()
  await dialog.getByLabel('Nota de gestion').fill('Se envio ficha tecnica')
  await dialog.getByRole('button', { name: 'Guardar' }).click()
  await expect(page.getByText('Se envio ficha tecnica')).toBeVisible()

  // 4. Verlo reflejado en los indicadores
  expect(await kpi(page, 'total')).toBe(totalBefore + 1)
  expect(await kpi(page, 'CONTACTADO')).toBe(contactedBefore + 1)
  await page.getByRole('link', { name: 'Inicio', exact: true }).click()
  await expect(page.getByText('Leads registrados')).toBeVisible()

  // 5. Exportar registros autorizados: el administrador lo exporta; un vendedor ajeno no lo recibe
  const mine = await csvRows(page, `q=${encodeURIComponent(NAME)}`)
  expect(mine).toHaveLength(1)
  expect(mine[0]).toContain(`${code};`)
  expect(mine[0]).toContain(';Contactado;Laura Jimenez;')

  const other = await browser.newPage()
  await login(other, 'carlos.mora@craisa.test')
  expect(await csvRows(other, `q=${encodeURIComponent(NAME)}`)).toHaveLength(0)
  const all = await csvRows(other, '')
  expect(all.every((row) => row.includes(';Carlos Mora;'))).toBe(true)
  await other.close()
})
