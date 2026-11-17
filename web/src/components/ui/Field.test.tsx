/**
 * Testes do seletor: lista vazia avisa e oferece criar.
 *
 * @module components/ui/Field.test
 */
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { CREATE_OPTION_VALUE, Select } from './Field';

describe('Select vazio', () => {
  afterEach(cleanup);

  it('mostra que não há opções e a opção de criar', () => {
    render(
      <Select
        label='Conta'
        options={[]}
        placeholder='Escolha'
        value=''
        onChange={() => undefined}
        empty={{ message: 'Nenhuma conta cadastrada', createLabel: '+ Criar conta', onCreate: () => undefined }}
      />
    );
    const message = screen.getByRole('option', { name: 'Nenhuma conta cadastrada' });
    expect(message).toHaveProperty('disabled', true);
    expect(screen.getByRole('option', { name: '+ Criar conta' })).toBeTruthy();
  });

  it('escolher criar chama onCreate e não troca o valor', () => {
    const onCreate = vi.fn();
    const onChange = vi.fn();
    render(<Select label='Conta' options={[]} placeholder='Escolha' value='' onChange={onChange} empty={{ message: 'Nenhuma conta cadastrada', createLabel: '+ Criar conta', onCreate }} />);
    fireEvent.change(screen.getByLabelText('Conta'), { target: { value: CREATE_OPTION_VALUE } });
    expect(onCreate).toHaveBeenCalledTimes(1);
    expect(onChange).not.toHaveBeenCalled();
  });

  it('com opções, não mostra o aviso nem a opção de criar', () => {
    render(
      <Select
        label='Conta'
        options={[{ value: 'a1', label: 'Nubank' }]}
        value='a1'
        onChange={() => undefined}
        empty={{ message: 'Nenhuma conta cadastrada', createLabel: '+ Criar conta', onCreate: () => undefined }}
      />
    );
    expect(screen.queryByRole('option', { name: 'Nenhuma conta cadastrada' })).toBeNull();
    expect(screen.queryByRole('option', { name: '+ Criar conta' })).toBeNull();
  });
});
