import { BigDecimal, BigInt, Address } from "@graphprotocol/graph-ts"
import { Cream, Transfer } from "../generated/Cream/Cream"
import { IceCream, Deposit, Withdraw } from "../generated/IceCream/IceCream"
import { CREAM, CREAMHolder } from "../generated/schema"

let CREAM_ID = '0'
let ZERO_DEC = BigDecimal.fromString('0')
let ZERO_ADDR = Address.fromString('0x0000000000000000000000000000000000000000')
let ICE_CREAM_ADDRESS = Address.fromString('0x3986425b96F11972d31C78ff340908832C5c0043')

export function tenPow(exponent: number): BigInt {
  let result = BigInt.fromI32(1)
  for (let i = 0; i < exponent; i++) {
    result = result.times(BigInt.fromI32(10))
  }
  return result
}

export function normalize(i: BigInt, decimals: number = 18): BigDecimal {
  return i.toBigDecimal().div(new BigDecimal(tenPow(decimals)))
}

export function getCREAMHolder(address: Address): CREAMHolder | null {
  if (address.equals(ZERO_ADDR)) {
    return null
  }
  let entity = CREAMHolder.load(address.toHex())
  if (entity == null) {
    entity = new CREAMHolder(address.toHex())
    entity.address = address.toHex()
    entity.creamBalance = ZERO_DEC
    entity.iceCreamBalance = ZERO_DEC
    entity.save()
  }
  return entity as CREAMHolder
}
export function handleDeposit(event: Deposit): void {
  let address = getCREAMHolder(event.params.provider)
  let iceCreamContract = IceCream.bind(ICE_CREAM_ADDRESS)

  let addressBalance = iceCreamContract.try_balanceOf(event.params.provider);
  if (addressBalance.reverted) {
    // do nothing
  } else {
    let value = addressBalance.value;
    address.iceCreamBalance = normalize(value);
  }

  address.save()
}
export function handleWithdraw(event: Withdraw): void {
  let address = getCREAMHolder(event.params.provider)
  let iceCreamContract = IceCream.bind(ICE_CREAM_ADDRESS)

  let addressBalance = iceCreamContract.try_balanceOf(event.params.provider);
  if (addressBalance.reverted) {
    // do nothing
  } else {
    let value = addressBalance.value;
    address.iceCreamBalance = normalize(value);
  }

  address.save()
}

export function handleTransfer(event: Transfer): void {

  // find CREAM entity or create it if it does not exist yet
  let cream = CREAM.load(CREAM_ID)
  if (cream == null) {
    cream = new CREAM(CREAM_ID)
    cream.totalSupply = ZERO_DEC
  }
  cream.save()

  // update CREAM total supply on event transfer to/from zero address
  let value = normalize(event.params.amount)
  if (event.params.from.equals(ZERO_ADDR)) {
    // mint
    cream.totalSupply = cream.totalSupply.plus(value)
  } else if (event.params.to.equals(ZERO_ADDR)) {
    // burn
    cream.totalSupply = cream.totalSupply.minus(value)
  }
  cream.save()

  // update from address
  let from = getCREAMHolder(event.params.from)
  if (from != null) {
    from.creamBalance = from.creamBalance.minus(value)
    from.save()
  }

  // update to address
  let to = getCREAMHolder(event.params.to)
  if (to != null) {
    to.creamBalance = to.creamBalance.plus(value)
    to.save()
  }

}
