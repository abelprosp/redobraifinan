import { PrismaClient } from "@prisma/client"
import * as bcrypt from "bcryptjs"

const prisma = new PrismaClient()

async function main() {
  console.log("🌱 Iniciando seed do banco de dados...")

  // ============================================================================
  // CRIAR EMPRESA PADRÃO
  // ============================================================================
  const company = await prisma.company.upsert({
    where: { document: "12345678000199" },
    update: {},
    create: {
      id: "default",
      name: "Empresa Demonstração LTDA",
      tradeName: "Demo Finan",
      document: "12345678000199",
      email: "contato@demo.com.br",
      phone: "11999999999",
      addressStreet: "Av. Paulista",
      addressNumber: "1000",
      addressCity: "São Paulo",
      addressState: "SP",
      addressZipCode: "01310100",
      sicrediEnvironment: "sandbox",
    },
  })

  console.log(`✅ Empresa criada: ${company.name}`)

  // ============================================================================
  // CRIAR USUÁRIO ADMIN
  // ============================================================================
  const passwordHash = await bcrypt.hash("admin123", 10)
  
  const user = await prisma.user.upsert({
    where: { email: "admin@redobrai.com.br" },
    update: {},
    create: {
      name: "Administrador",
      email: "admin@redobrai.com.br",
      passwordHash,
      role: "ADMIN",
      companyId: company.id,
      isActive: true,
    },
  })

  console.log(`✅ Usuário admin criado: ${user.email}`)

  // ============================================================================
  // CRIAR CLIENTES DE EXEMPLO
  // ============================================================================
  const clientes = [
    {
      tipoPessoa: "PF" as const,
      documento: "12345678909",
      nome: "Maria Silva Santos",
      email: "maria.silva@email.com",
      telefone: "11999887766",
      endereco: "Rua das Flores",
      numero: "123",
      cidade: "São Paulo",
      uf: "SP",
      cep: "01310000",
      status: "ATIVO" as const,
    },
    {
      tipoPessoa: "PJ" as const,
      documento: "98765432000188",
      nome: "Tech Solutions LTDA",
      nomeFantasia: "Tech Solutions",
      email: "financeiro@techsolutions.com.br",
      telefone: "11988776655",
      endereco: "Av. Brigadeiro Faria Lima",
      numero: "500",
      complemento: "Sala 1001",
      cidade: "São Paulo",
      uf: "SP",
      cep: "04538132",
      status: "ATIVO" as const,
    },
    {
      tipoPessoa: "PF" as const,
      documento: "98765432100",
      nome: "João Carlos Mendes",
      email: "joao.mendes@email.com",
      telefone: "11977665544",
      cidade: "Rio de Janeiro",
      uf: "RJ",
      status: "ATIVO" as const,
    },
    {
      tipoPessoa: "PJ" as const,
      documento: "11222333000144",
      nome: "Comércio ABC LTDA",
      nomeFantasia: "Loja ABC",
      email: "contato@lojaabc.com.br",
      telefone: "11966554433",
      cidade: "Campinas",
      uf: "SP",
      status: "PENDENTE" as const,
    },
    {
      tipoPessoa: "PF" as const,
      documento: "45678912300",
      nome: "Ana Paula Oliveira",
      email: "ana.oliveira@email.com",
      telefone: "11955443322",
      cidade: "Curitiba",
      uf: "PR",
      status: "ATIVO" as const,
    },
  ]

  for (const clienteData of clientes) {
    const cliente = await prisma.cliente.upsert({
      where: {
        companyId_documento: {
          companyId: company.id,
          documento: clienteData.documento,
        },
      },
      update: {},
      create: {
        companyId: company.id,
        ...clienteData,
      },
    })
    console.log(`✅ Cliente criado: ${cliente.nome}`)
  }

  // ============================================================================
  // CRIAR BOLETOS DE EXEMPLO
  // ============================================================================
  const clientesList = await prisma.cliente.findMany({
    where: { companyId: company.id },
  })

  const now = new Date()
  const boletosData = [
    {
      clienteId: clientesList[0].id,
      valor: 1500.00,
      dataVencimento: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000), // +7 dias
      status: "PENDENTE" as const,
      tipoCobranca: "HIBRIDO" as const,
    },
    {
      clienteId: clientesList[1].id,
      valor: 8500.00,
      dataVencimento: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000), // -5 dias
      dataPagamento: new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000),
      valorPago: 8500.00,
      status: "PAGO" as const,
      tipoCobranca: "HIBRIDO" as const,
    },
    {
      clienteId: clientesList[2].id,
      valor: 750.00,
      dataVencimento: new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000), // -10 dias (vencido)
      status: "VENCIDO" as const,
      tipoCobranca: "NORMAL" as const,
    },
    {
      clienteId: clientesList[3].id,
      valor: 3200.00,
      dataVencimento: new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000), // +2 dias
      status: "PENDENTE" as const,
      tipoCobranca: "HIBRIDO" as const,
    },
    {
      clienteId: clientesList[4].id,
      valor: 2100.00,
      dataVencimento: new Date(now.getTime() + 1 * 24 * 60 * 60 * 1000), // +1 dia
      status: "PENDENTE" as const,
      tipoCobranca: "HIBRIDO" as const,
    },
    {
      clienteId: clientesList[0].id,
      valor: 5000.00,
      dataVencimento: new Date(now.getTime() - 15 * 24 * 60 * 60 * 1000),
      dataPagamento: new Date(now.getTime() - 16 * 24 * 60 * 60 * 1000),
      valorPago: 5000.00,
      status: "PAGO" as const,
      tipoCobranca: "NORMAL" as const,
    },
    {
      clienteId: clientesList[1].id,
      valor: 12000.00,
      dataVencimento: new Date(now.getTime() - 20 * 24 * 60 * 60 * 1000),
      dataPagamento: new Date(now.getTime() - 21 * 24 * 60 * 60 * 1000),
      valorPago: 12000.00,
      status: "PAGO" as const,
      tipoCobranca: "HIBRIDO" as const,
    },
  ]

  let boletoCount = 0
  for (const boletoData of boletosData) {
    boletoCount++
    const nossoNumero = `26200000${String(boletoCount).padStart(2, "0")}1`
    
    await prisma.boleto.create({
      data: {
        companyId: company.id,
        clienteId: boletoData.clienteId,
        nossoNumero,
        seuNumero: `NF-${String(1000 + boletoCount)}`,
        tipoCobranca: boletoData.tipoCobranca,
        especieDocumento: "DUPLICATA_SERVICO_INDICACAO",
        valor: boletoData.valor,
        valorPago: boletoData.valorPago,
        dataVencimento: boletoData.dataVencimento,
        dataPagamento: boletoData.dataPagamento,
        status: boletoData.status,
        tipoJuros: "PERCENTUAL",
        juros: 0.033,
        multa: 2,
        linhaDigitavel: `74891.12511 00614.205128 ${nossoNumero.slice(0, 5)}.351030 1 ${String(Math.floor(boletoData.valor * 100)).padStart(10, "0")}`,
        codigoBarras: `7489188640${String(Math.floor(boletoData.valor * 100)).padStart(10, "0")}1125100614205120`,
        txId: boletoData.tipoCobranca === "HIBRIDO" ? `tx${Date.now()}${boletoCount}` : null,
        qrCode: boletoData.tipoCobranca === "HIBRIDO" 
          ? `00020126930014br.gov.bcb.pix2571pix.sicredi.com.br/${nossoNumero}520400005303986${String(Math.floor(boletoData.valor * 100)).padStart(10, "0")}5802BR`
          : null,
      },
    })
  }

  console.log(`✅ ${boletosData.length} boletos criados`)

  // ============================================================================
  // CRIAR CONTA PADRÃO
  // ============================================================================
  await prisma.conta.upsert({
    where: { id: "conta-principal" },
    update: {},
    create: {
      id: "conta-principal",
      companyId: company.id,
      nome: "Conta Principal",
      descricao: "Conta corrente principal da empresa",
      tipo: "corrente",
      saldo: 25500.00,
      banco: "Sicredi",
      agencia: "0100",
      numeroConta: "12345-6",
      isActive: true,
    },
  })

  console.log("✅ Conta principal criada")

  console.log("\n🎉 Seed concluído com sucesso!")
  console.log("\n📝 Credenciais de acesso:")
  console.log("   Email: admin@redobrai.com.br")
  console.log("   Senha: admin123")
}

main()
  .catch((e) => {
    console.error("❌ Erro no seed:", e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
