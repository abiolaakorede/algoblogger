from pyteal import *

class Blogger:
    class Variables:
        author = Bytes("AUTHOR")
        content = Bytes("CONTENT")
        title = Bytes("TITLE")
        image = Bytes("IMAGE")
        tippers = Bytes("TIPPERS")
        total = Bytes("TOTAL")
        owner = Bytes("OWNER")

    class AppMethods:
        tip = Bytes("tip")

    def application_creation(self):
        return Seq([
            #The Length of arguments passed should be 4
            Assert(Txn.application_args.length() == Int(4)),
            # The note attached to the transaction must be "algoblogger:re10.10",
            
            Assert(Txn.note() == Bytes("algoblogger:re10.10")),
            App.globalPut(self.Variables.author, Txn.application_args[0]),
            App.globalPut(self.Variables.content, Txn.application_args[1]),
            App.globalPut(self.Variables.title, Txn.application_args[2]),
            App.globalPut(self.Variables.image, Txn.application_args[3]),
            App.globalPut(self.Variables.tippers, Int(0)),
            App.globalPut(self.Variables.total, Int(0)),
            App.globalPut(self.Variables.owner, Txn.sender()),
            Approve()
        ])

    def tipPost(self):
        return Seq([
            # 
            Assert(
                And(
                     # The number of transactions within the group transaction must be exactly 2.
                # first one being the tip function and the second being the payment transactions
                    Global.group_size() == Int(2),
                    # The number of arguments attached to the transaction should be exactly 2.

                    Txn.application_args.length() == Int(2),
                ),
            ),
            Assert(
                And(
                    Gtxn[1].type_enum() == TxnType.Payment,
                    Gtxn[1].receiver() == App.globalGet(
                        self.Variables.owner),                   
                    Gtxn[1].sender() == Gtxn[0].sender(),
                    Gtxn[1].amount() == Btoi(Txn.application_args[1]),
                )
            ),

#increase the number of tippers of a post
            App.globalPut(self.Variables.tippers, App.globalGet(self.Variables.tippers) + Int(1)),
            #increase the total of the tips
            App.globalPut(self.Variables.total, App.globalGet(self.Variables.total) + Btoi(Txn.application_args[1])),
            Approve()
        ])

    def application_deletion(self):
        return Return(Txn.sender() == Global.creator_address())

    def application_start(self):
        return Cond(
            [Txn.application_id() == Int(0), self.application_creation()],
            [Txn.on_completion() == OnComplete.DeleteApplication,
             self.application_deletion()],
            [Txn.application_args[0] == self.AppMethods.tip, self.tipPost()],
        )

    def approval_program(self):
        return self.application_start()

    def clear_program(self):
        return Return(Int(1))


        