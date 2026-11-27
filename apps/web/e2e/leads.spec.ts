import ExcelJS from 'exceljs'
import { expect, test, type Page } from '@playwright/test'

const PASSWORD = 'Craisa2026!'

async function login(page: Page, email: string) {
  await page.goto('/login')
  await page.getByLabel('Correo').fill(email)
  await page.getByLabel('Contraseña').fill(PASSWORD)
  await page.getByRole('button', { name: 'Ingresar' }).click()
  await expect(page.getByRole('heading', { name: /^Buen(os|as) (dias|tardes|noches)/ })).toBeVisible()
}

test('redirige al login sin sesion y rechaza credenciales malas', async ({ page }) => {
  await page.goto('/leads')
  await expect(page).toHaveURL(/\/login/)
  await page.getByLabel('Correo').fill('admin@craisa.test')
  await page.getByLabel('Contraseña').fill('incorrecta')
  await page.getByRole('button', { name: 'Ingresar' }).click()
  await expect(page.getByRole('alert')).toContainText('incorrectos')
})

test('registra un lead, cambia su estado con nota y queda en la bitacora', async ({ page }) => {
  await login(page, 'admin@craisa.test')
  await page.getByRole('link', { name: 'Nuevo lead' }).first().click()

  // Validacion de obligatorios antes de enviar.
  await page.getByRole('button', { name: 'Registrar lead' }).click()
  await expect(page.getByText('Ingrese el nombre')).toBeVisible()

  await page.getByLabel('Nombre').fill('Prueba E2E Rodriguez')
  await page.getByLabel('Empresa').fill('Finca Prueba')
  await page.getByLabel('Telefono').fill('8888-7777')
  await page.getByText('Feria', { exact: true }).click()
  await page.getByLabel('Linea de negocio').selectOption({ label: 'Maquinaria Agricola' })
  await page.getByLabel('Producto de interes').selectOption({ label: 'Tractor CASE IH Farmall (55 a 90 HP)' })
  await page.getByLabel('Descripcion de la consulta').fill('Interes en tractor para finca de cafe')
  await page.getByLabel('Responsable').selectOption({ label: 'Carlos Mora' })
  await page.getByRole('button', { name: 'Registrar lead' }).click()

  await expect(page.getByRole('heading', { name: 'Prueba E2E Rodriguez' })).toBeVisible()
  await expect(page).toHaveURL(/\/leads\/LEAD-\d{4}-\d{4}$/)

  await page.getByRole('button', { name: 'Actualizar estado' }).click()
  const dialog = page.getByRole('dialog', { name: 'Actualizar estado' })
  await dialog.getByText('Contactado', { exact: true }).click()
  await dialog.getByLabel('Nota de gestion').fill('Primera llamada, pide cotizacion')
  await dialog.getByRole('button', { name: 'Guardar' }).click()

  await expect(page.getByText('Primera llamada, pide cotizacion')).toBeVisible()
  await expect(page.getByText('Estado actualizado a Contactado')).toBeVisible()
})

test('avisa al registrar un cliente que ya tiene un lead', async ({ page }) => {
  await login(page, 'admin@craisa.test')
  await page.goto('/leads/nuevo')
  // Telefono de un lead del seed escrito con prefijo y sin guion.
  await page.getByLabel('Telefono').fill('+506 88142290')
  const warning = page.getByText('Este cliente ya tiene un lead')
  await expect(warning).toBeVisible()
  await expect(page.getByText('mismo telefono')).toBeVisible()
})

test('marcar como perdido exige motivo', async ({ page }) => {
  await login(page, 'admin@craisa.test')
  await page.goto('/leads?status=NUEVO')
  await page.locator('tbody tr').first().getByRole('link').click()
  await page.getByRole('button', { name: 'Actualizar estado' }).click()
  const dialog = page.getByRole('dialog', { name: 'Actualizar estado' })
  await dialog.getByText('Perdido', { exact: true }).click()
  await dialog.getByRole('button', { name: 'Guardar' }).click()
  await expect(dialog.getByText('Indique el motivo de perdida')).toBeVisible()
  await dialog.getByLabel('Motivo de perdida').fill('Compro a la competencia')
  await dialog.getByRole('button', { name: 'Guardar' }).click()
  await expect(page.getByText('Motivo de perdida:')).toBeVisible()
})

test('filtra el listado y la exportacion CSV respeta los filtros', async ({ page }) => {
  await login(page, 'admin@craisa.test')
  await page.goto('/leads')
  await page.getByRole('button', { name: 'Canal' }).click()
  const filtered = page.waitForResponse((r) => r.url().includes('/api/leads?') && r.url().includes('channel=WHATSAPP'))
  await page.getByRole('dialog').getByText('WhatsApp', { exact: true }).click()
  await page.keyboard.press('Escape')
  await expect(page).toHaveURL(/channel=WHATSAPP/)
  const { total: apiTotal } = (await (await filtered).json()) as { total: number }
  await expect(page.getByText(new RegExp(` de ${apiTotal} leads`))).toBeVisible()

  const summary = await page.getByText(/ de \d+ leads/).textContent()
  const total = Number(summary?.match(/de (\d+)/)?.[1])
  expect(total).toBeGreaterThan(0)

  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('link', { name: 'Exportar a Excel' }).click(),
  ])
  expect(download.suggestedFilename()).toMatch(/^leads-craisa-.*\.xlsx$/)
  // El Excel con formato y el CSV salen de la misma consulta; el CSV permite contar filas sin abrir el xlsx.
  const exportUrl = new URL(download.url())
  const text = await (await page.request.get(exportUrl.pathname.replace('.xlsx', '.csv') + exportUrl.search)).text()
  expect(text.charCodeAt(0)).toBe(0xfeff)
  const lines = text.slice(1).trim().split('\r\n')
  expect(lines[0]).toContain('Codigo;Fecha de ingreso;Nombre')
  expect(lines).toHaveLength(total + 1)
  expect(lines.slice(1).every((l) => l.includes(';WhatsApp;'))).toBe(true)
})

test('un vendedor solo ve sus leads y no administra usuarios', async ({ page }) => {
  await login(page, 'carlos.mora@craisa.test')
  const res = await page.request.get('/api/leads?pageSize=100')
  const body = (await res.json()) as { items: { assignedTo: { name: string } | null }[] }
  expect(body.items.length).toBeGreaterThan(0)
  expect(body.items.every((l) => l.assignedTo?.name === 'Carlos Mora')).toBe(true)

  await expect(page.getByRole('link', { name: 'Usuarios' })).toHaveCount(0)
  await page.goto('/admin/usuarios')
  await expect(page).toHaveURL(/\/$/)
  expect((await page.request.get('/api/users')).status()).toBe(403)
})

test('el vendedor recibe la notificacion del lead que le asignan y la abre', async ({ page }) => {
  await login(page, 'admin@craisa.test')
  const catalogs = (await (await page.request.get('/api/catalogs')).json()) as {
    lines: { id: string; name: string }[]
    users: { id: string; name: string }[]
  }
  const created = await page.request.post('/api/leads', {
    data: {
      entryDate: '2026-11-02',
      contactName: 'Aviso E2E Solano',
      phone: '8888-1212',
      channel: 'LLAMADA',
      description: 'Consulta para probar avisos',
      businessLineId: catalogs.lines[0]!.id,
      assignedToId: catalogs.users.find((u) => u.name === 'Carlos Mora')!.id,
    },
  })
  const { code } = (await created.json()) as { code: string }

  await page.context().clearCookies()
  await login(page, 'carlos.mora@craisa.test')
  await page.getByRole('button', { name: /^Notificaciones: .*sin leer/ }).click()
  await page.getByRole('button', { name: /Admin.* le asigno un lead nuevo/ }).filter({ hasText: code }).click()
  await expect(page).toHaveURL(new RegExp(`/leads/${code}$`))
  await expect(page.getByRole('heading', { name: 'Aviso E2E Solano' })).toBeVisible()
})

test('el dashboard enlaza al listado filtrado', async ({ page }) => {
  await login(page, 'admin@craisa.test')
  await page.getByRole('button', { name: 'Este año' }).click()
  await expect(page.getByText('Leads en el periodo')).toBeVisible()
  await page.getByRole('link', { name: /Acciones vencidas/ }).click()
  await expect(page).toHaveURL(/overdue=1/)
  await expect(page.getByRole('button', { name: 'Vencidas', exact: true })).toHaveAttribute('aria-pressed', 'true')
})

test('mueve un lead de etapa desde el tablero', async ({ page }) => {
  await login(page, 'admin@craisa.test')
  await page.goto('/leads?view=board')
  const card = page.getByRole('region', { name: 'Nuevo' }).getByRole('article').first()
  const code = await card.getByText(/^LEAD-\d{4}-\d{4}$/).innerText()
  await card.getByRole('button', { name: 'Mover a' }).click()
  await page.getByRole('menuitem', { name: 'Contactado' }).click()
  await expect(page.getByRole('region', { name: 'Contactado' }).getByText(code, { exact: true })).toBeVisible()
  await expect(page.getByRole('region', { name: 'Nuevo' }).getByText(code, { exact: true })).toHaveCount(0)
})

test('importa leads desde Excel', async ({ page }) => {
  const wb = new ExcelJS.Workbook()
  const ws = wb.addWorksheet('Leads')
  ws.addRow(['Nombre', 'Telefono', 'Canal', 'Linea', 'Descripcion'])
  ws.addRow(['Importado E2E Vargas', '8777-1234', 'Feria', 'Maquinaria Agricola', 'Contacto de la feria ganadera'])
  ws.addRow(['Sin Contacto E2E', '', 'Feria', 'Maquinaria Agricola', 'Fila sin telefono ni correo'])
  const path = test.info().outputPath('ferias.xlsx')
  await wb.xlsx.writeFile(path)

  await login(page, 'admin@craisa.test')
  await page.goto('/leads')
  await page.getByRole('button', { name: 'Importar' }).click()
  await page.getByLabel('Archivo de Excel').setInputFiles(path)
  await expect(page.getByText('1 listo para importar')).toBeVisible()
  await expect(page.getByText('Indique telefono o correo')).toBeVisible()
  await page.getByRole('button', { name: 'Importar 1 lead' }).click()
  await expect(page.getByText('Se importo 1 lead')).toBeVisible()
  await page.goto('/leads?q=Importado%20E2E%20Vargas')
  await expect(page.getByRole('table').getByText('Importado E2E Vargas')).toBeVisible()
})

test('las pestanas de estado muestran cuantos leads hay en cada una', async ({ page }) => {
  await login(page, 'admin@craisa.test')
  await page.goto('/leads')
  const tab = page.getByRole('tab', { name: /Nuevo/ })
  await expect(tab).toHaveText(/\d/)
  const count = Number((await tab.textContent())?.replace(/\D/g, ''))
  await tab.click()
  await expect(page).toHaveURL(/status=NUEVO/)
  await expect(page.getByText(new RegExp(` de ${count} leads`))).toBeVisible()
})
