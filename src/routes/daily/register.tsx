import { Box, Button, Flex, Heading, IconButton, Image, Input, Stack } from '@chakra-ui/react'
import { LuMoon, LuSun } from 'react-icons/lu'
import autopcr from '@/assets/autopcr.svg'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { keyframes } from '@emotion/react'
import { useColorMode } from '@/components/ui/color-mode'
import { SubmitHandler, useForm } from 'react-hook-form'
import { Field } from '@/components/ui/field'
import { postRegister } from '@api/Register'
import { toaster } from '@/components/ui/toaster'

export const Route = createFileRoute('/daily/register')({ component: RegisterComponent })

const float = keyframes`0%{transform:translateY(0)}50%{transform:translateY(-10px)}100%{transform:translateY(0)}`
const pulse = keyframes`0%{transform:scale(1);opacity:.3}50%{transform:scale(1.1);opacity:.6}100%{transform:scale(1);opacity:.3}`

type Inputs = { qq: string; password: string; password2: string }

export function RegisterComponent() {
  const { toggleColorMode, colorMode } = useColorMode()
  const navigate = useNavigate()
  const { handleSubmit, register, formState: { isSubmitting } } = useForm<Inputs>()

  const onSubmit: SubmitHandler<Inputs> = async (v) => {
    if (v.password !== v.password2) {
      toaster.create({ type: 'error', title: '注册失败', description: '两次密码不一致' })
      return
    }
    if (v.password.length < 6) {
      toaster.create({ type: 'error', title: '注册失败', description: '密码至少 6 位' })
      return
    }

    try {
      await postRegister(v.qq, v.password)
      toaster.create({ type: 'success', title: '注册成功', description: '请返回登录页重新登录' })
      await navigate({ to: '/daily/login' })
    } catch {
      // global interceptor handles error
    }
  }

  return (
    <Flex h="100vh" align="center" justify="center" bg="bg.canvas" position="relative" overflow="hidden" p={{ base: 0, md: 4 }}>
      <Box position="absolute" bottom="-10%" right="-10%" w="500px" h="500px" bg="purple.500" filter="blur(120px)" opacity="0.2" rounded="full" animation={`${pulse} 20s infinite ease-in-out reverse`} />
      <Box position="absolute" top={4} right={4} zIndex={10}>
        <IconButton variant="ghost" aria-label="Toggle" onClick={toggleColorMode} size="lg" css={{ color: 'fg.muted', _hover: { color: 'fg', bg: 'bg.subtle' } }}>
          {colorMode === 'light' ? <LuMoon /> : <LuSun />}
        </IconButton>
      </Box>

      <Flex w="full" maxW="4xl" h={{ base: 'full', md: 'auto' }} maxH={{ md: '80vh' }} bg="bg.panel" rounded={{ base: 'none', md: 'xl' }} shadow={{ base: 'none', md: 'md' }} overflow="hidden" flexDir={{ base: 'column', md: 'row' }} zIndex={1} borderWidth={{ base: '0px', md: '1px' }} borderColor="border.subtle">
        <Flex flex="1" bg="bg.subtle" p={{ base: 8, md: 12 }} flexDir="column" justify="center" align="center" borderRightWidth={{ md: '1px' }} borderBottomWidth={{ base: '1px', md: '0' }} borderColor="border.subtle" display={{ base: 'none', md: 'flex' }} position="relative">
          <Box position="absolute" w="60%" h="60%" rounded="full" bg="bg.subtle" opacity="0.4" />
          <Image src={autopcr} alt="autopcr" w="240px" maxW="60%" h="auto" objectFit="contain" zIndex={1} css={{ _dark: { filter: 'brightness(0) invert(1)' } }} animation={`${float} 6s ease-in-out infinite`} />
        </Flex>

        <Flex flex="1" p={{ base: 6, md: 8, lg: 10 }} flexDir="column" justify="center" overflowY="auto">
          <Flex justify="center" mb={6} display={{ base: 'flex', md: 'none' }}>
            <Image src={autopcr} alt="autopcr" h="48px" css={{ _dark: { filter: 'brightness(0) invert(1)' } }} />
          </Flex>
          <Box mb={8} textAlign={{ base: 'center', md: 'left' }}>
            <Heading size="2xl" mb={2}>注册新账号</Heading>
          </Box>

          <Box w="full">
            <form onSubmit={handleSubmit(onSubmit)}>
              <Stack gap={4}>
                <Field label="账号"><Input type="text" {...register('qq')} placeholder="请输入QQ号" /></Field>
                <Field label="密码"><Input type="password" {...register('password')} placeholder="请输入密码（至少6位）" /></Field>
                <Field label="确认密码"><Input type="password" {...register('password2')} placeholder="请再次输入密码" /></Field>
                <Stack gap={4}>
                  <Button colorPalette="brand" loading={isSubmitting} type="submit">注册并返回登录</Button>
                  <Button colorPalette="brand" variant="outline" onClick={() => navigate({ to: '/daily/login' })}>返回登录</Button>
                </Stack>
              </Stack>
            </form>
          </Box>
        </Flex>
      </Flex>
    </Flex>
  )
}
