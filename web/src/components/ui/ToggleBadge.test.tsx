/**
 * Testes do selo que liga e desliga uma opção.
 *
 * @module components/ui/ToggleBadge.test
 */
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { ToggleBadge } from './ToggleBadge';

/**
 * Selo controlado para o teste.
 *
 * @returns Selo com estado próprio
 */
function Harness() {
  const [on, setOn] = useState(false);
  return (
    <ToggleBadge pressed={on} onPressedChange={setOn}>
      Incluir bens
    </ToggleBadge>
  );
}

describe('ToggleBadge', () => {
  afterEach(cleanup);

  it('começa desligado e alterna ao clicar', () => {
    render(<Harness />);
    const badge = screen.getByRole('button', { name: 'Incluir bens' });
    expect(badge.getAttribute('aria-pressed')).toBe('false');
    fireEvent.click(badge);
    expect(badge.getAttribute('aria-pressed')).toBe('true');
  });
});
