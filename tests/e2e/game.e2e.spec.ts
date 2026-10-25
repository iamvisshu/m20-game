import { expect, test } from '@playwright/test'

test('starts a game and displays the first question', async ({ page }) => {
  await page.goto('/')

  await expect(page.getByRole('heading', { name: /m20/i })).toBeVisible()

  await expect(
    page.getByRole('button', { name: 'YES', exact: true }),
  ).toBeVisible()

  await expect(
    page.getByRole('button', { name: 'PROBABLY_YES', exact: true }),
  ).toBeVisible()

  await expect(
    page.getByRole('button', { name: 'UNKNOWN', exact: true }),
  ).toBeVisible()

  await expect(
    page.getByRole('button', { name: 'PROBABLY_NO', exact: true }),
  ).toBeVisible()

  await expect(
    page.getByRole('button', { name: 'NO', exact: true }),
  ).toBeVisible()
})
