/**
 * Testes do campo monetário.
 *
 * @module components/ui/MoneyInput.test
 */
import { fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { describe, expect, it } from 'vitest';
import { MoneyInput, parseCents } from './MoneyInput';

/**
 * Invólucro com estado para testar o campo controlado.
 *
 * @returns Campo e valor atual em texto
 */
function Harness() {
  const [value, setValue] = useState<number | null>(null);
  return (
    <>
      <MoneyInput label='Valor' value={value} onChange={setValue} />
      <output>{String(value)}</output>
    </>
  );
}

describe('MoneyInput', () => {
  it('converte texto em centavos ignorando símbolos', () => {
    expect(parseCents('R$ 12,50')).toBe(1250);
    expect(parseCents('abc')).toBeNull();
  });

  it('cresce da direita, como calculadora', () => {
    render(<Harness />);
    const input = screen.getByLabelText('Valor');
    fireEvent.change(input, { target: { value: '1250' } });
    expect(screen.getByRole('status').textContent).toBe('1250');
    expect((input as HTMLInputElement).value.replace(/ /g, ' ')).toBe('R$ 12,50');
  });
});
