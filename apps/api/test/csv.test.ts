import { describe, expect, it } from 'vitest'
import { csvCell, toCsv } from '../src/leads/csv.ts'

describe('csv', () => {
  it('escapa separador, comillas y saltos de linea', () => {
    expect(csvCell('a;b')).toBe('"a;b"')
    expect(csvCell('dijo "hola"')).toBe('"dijo ""hola"""')
    expect(csvCell('linea\nnueva')).toBe('"linea\nnueva"')
  })

  it('neutraliza formulas de Excel', () => {
    expect(csvCell('=HYPERLINK("x")')).toBe(`"'=HYPERLINK(""x"")"`)
    expect(csvCell('+50688880000')).toBe("'+50688880000")
    expect(csvCell('@SUM(A1)')).toBe("'@SUM(A1)")
  })

  it('incluye BOM y usa CRLF', () => {
    const out = toCsv([])
    expect(out.charCodeAt(0)).toBe(0xfeff)
    expect(out.endsWith('\r\n')).toBe(true)
    expect(out).toContain('Codigo;Fecha de ingreso;Nombre')
  })
})
